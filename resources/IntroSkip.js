/**
 * @author James Perry
 * An attempt at dynamically skipping anime intro sequences.
 * 
 * At time of implementing subtiltes match the following format:
 * Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
 * Dialogue: 0,0:00:07.84,0:00:09.46,string,Acchan,0000,0000,0000,,string, string.
 */
var CURRENT_TIME = -1;
var button_css = {
    'padding': '10px 20px',
    'background-color': 'transparent',
    'color': 'white',
    'border-radius': '5px',
    'border': '1px white solid',
    'position': 'fixed',
    'bottom': '50px',
    'right': '100px',
    'z-index': 100
}

/**
 * Converts a timestamp into seconds
 * @param {string} time - Timestamp in the format of 0:02:34.55
 */
var to_seconds = function(time){
	var t = time.split(':');
	return (+t[0]) * 60 * 60 + (+t[1]) * 60 + (+t[2]);
}

/**
 * Pulls vilos player metadata config from the page, since the video 
 * content gets loaded in an iframe its not accessible directly
 */
var get_page_metadata = function() {
    var metadata = {}
    $('script').each(function() {
        var text = this.text;
        if (text.indexOf('vilos.config.media') > 0) {
            var metadata_regex = /(?:vilos\.config\.media\s*=\s*)({.+?});/g
            var metadata_raw = metadata_regex.exec(text)
            metadata = JSON.parse(metadata_raw[1]);
            return;
        }
    });
    return metadata;
}


/**
 * Performs skipping of intros by several methods
 */
var intro_skip = function(){
    var metadata = get_page_metadata()
    var request = new XMLHttpRequest();
    request.open('GET', metadata.subtitles[0].url);
    request.responseType = 'text';
    console.log('Found subtitles at: ' + metadata.subtitles[0].url);
    request.onload = function() {
        var subtitles = request.response;
        //TODO: Data stucture for episode intros with dialog, use lsg as fallback
        var intro_times = find_intro(subtitles);
        console.log('Intro at: ' + intro_times[0] + ' - ' + intro_times[1]);
        var video = VILOS_PLAYERJS;
        var button_visible = false;
        var button_pressed = false;
        if(intro_times.length > 0){
            var skip_button = $('<button/>').text('Skip Intro').css(button_css);
            skip_button.click(function () {
                video.setCurrentTime(intro_times[1]);
                button_visible = false;
                button_pressed = true;
                skip_button.hide();
            }).mouseenter(function(){
                skip_button.css('background-color', 'black');
            }).mouseleave(function(){
                skip_button.css('background-color', 'transparent');
            }).focus(function(){
                skip_button.css('background-color', '#df6300');
            });
            var body = $('body');
            skip_button.hide()
            body.prepend(skip_button);
            var interval = setInterval(function(){
                VILOS_PLAYERJS.getCurrentTime(time => {CURRENT_TIME = time;});
                if (CURRENT_TIME < 0){
                    return;
                }
                if(intro_times[0] <= CURRENT_TIME && CURRENT_TIME < intro_times[1]){
                    if(!button_visible && !button_pressed){
                        button_visible = true; 
                        skip_button.show();
                    }
                } else{
                    button_visible = false;
                    skip_button.hide();
                }
                if(CURRENT_TIME > intro_times[1]){
                    button_visible = false
                    skip_button.hide();
                    clearInterval(interval);
                }
            }, 1000);
        }
    }
    request.send();
}


/**
 * Get intro by subtitle styles or LSG
 * @param {*} subtitles - Episode Subtitles
 * 
 * A normal subtitle looks something like:
 * Dialogue: 0,0:02:27.20,0:02:29.37,Default,,0000,0000,0000,,What is pi?
 * 
 * A subtitle for an intro looks like: 
 * Dialogue: 0,0:02:56.23,0:03:01.82,Default,,0000,0000,0000,,{\i1}Though there may be no right answers{\i0}\N{\i1}in my ill-defined tale,{\i0}
 * 
 * Style matching for intro detects sequences of the italicized subs by the {\i#} format.
 * LSG (Longest Subtitle Gap) detects sequences of missing subtitles by parsing all the timestamps and finding the max diff between two timestamps.
 */
var find_intro = function(subtitles){
    var dialog_line_regex = new RegExp(/Dialogue:.*/g);
    var dialog_timestamps = subtitles.match(dialog_line_regex);
    var timestamp_regex = new RegExp(/(?:\s0,)(\d+\:\d+\:\d+\.\d+,\d+\:\d+\:\d+\.\d+)/);
    // Style variables
    var longest_style_sequence = 0;
    var current_style_sequence = 0;
    var start = 0;
    var time_before_start = -1;
    var final_time_before_start = -1;
    var style_timestamps = [];
    // LSG variables
    var lsg_timestamps = [];
    // Only check half of episode subs
    for(var i = 0; i < dialog_timestamps.length/2; i++){
        // Get all timestamps. Check for style
        var style_match = dialog_timestamps[i].match(/,{\\i\d}.*/g);
        var timestamp_elements = timestamp_regex.exec(dialog_timestamps[i])[1].trim().split(',');
        // LSG Save
        lsg_timestamps.push(to_seconds(timestamp_elements[0]));
        lsg_timestamps.push(to_seconds(timestamp_elements[1]));
        if(style_match != null){
            current_style_sequence++;
            if(start == 0) {
                // Save the current start time
                start = to_seconds(timestamp_elements[0]);
                if (i-1 > 0){
                    var times_before_start = timestamp_regex.exec(dialog_timestamps[i-1])[1].trim().split(',');
                    time_before_start = to_seconds(times_before_start[1]);
                }
            }
        } else {
            // No match, sequence has ended, update longest if necessary
            if (current_style_sequence > longest_style_sequence) {
                longest_style_sequence = current_style_sequence;
                // If we have a new longest sequence we need to save these times
                style_timestamps = [];
                final_time_before_start = time_before_start
                var timestamp_elements = timestamp_regex.exec(dialog_timestamps[i])[1].trim().split(',');
                style_timestamps.push(start);
                style_timestamps.push(to_seconds(timestamp_elements[0]));
            }
            // Reset the start and current sequence
            start = 0;
            current_style_sequence = 0;
        }
    }
    // Subtract the avg time before the last subtitle before the intro and the first subtitle of the intro. This will help buffer the button display for the beginning of the intro.
    if(style_timestamps.length > 1){
        var avg_time_between_subs = Math.ceil((style_timestamps[0] - final_time_before_start)/2);
        style_timestamps[0] = style_timestamps[0] - avg_time_between_subs;
    }

    // LSG
    // Find largest diff between all timestamps, sorted by default.
    var current_max = -1;
    var start, end;
    for(var i = 0; i < lsg_timestamps.length; i++){
        if(i+1 >= lsg_timestamps.length || i > lsg_timestamps.length){
            break;
        }
        else {
            var diff = lsg_timestamps[i+1] - lsg_timestamps[i];
            if(diff > current_max){
                start = lsg_timestamps[i];
                end = lsg_timestamps[i+1];
                current_max = diff;
            }
        }
    }
    // This is arbitrary. Needs data, we just dont want false positives
    if(longest_style_sequence < 5){
        console.log('Found intro by LSG')
        return [start, end];
    }
    else {
        console.log('Found intro by subtitle style');
        console.log(style_timestamps);
        return style_timestamps;
    }
}