/**
 * @author James Perry
 * An attempt at dynamically skipping anime intro sequences.
 * 
 * At time of implementing subtiltes match the following format:
 * Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
 * Dialogue: 0,0:00:07.84,0:00:09.46,string,Acchan,0000,0000,0000,,string, string.
 */
var current_time = -1;
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
    metadata = {}
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
 * VILOS player only accepts a callback function to get the time.
 * @param {double} time - Time of current video
 */
var get_current_time = function(time){
    current_time = time;
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
        subtitles = request.response;
        // TODO: Data stucture for episode intros with dialog, use lsg as fallback
        var intro_times = time_by_lsg(subtitles);
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
                VILOS_PLAYERJS.getCurrentTime(time => {current_time = time;});
                if (current_time < 0){
                    return;
                }
                if(intro_times[0] <= current_time && current_time < intro_times[1]){
                    if(!button_visible && !button_pressed){
                        button_visible = true; 
                        skip_button.show();
                    }
                } else{
                    button_visible = false;
                    skip_button.hide();
                }
                if(current_time > intro_times[1]){
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
 * Returns a timestamp of a subtitle
 * @param {dictionary} subtitles - Episode subtitles
 * @param {string} subtitle_line - Line of which to find timestamp
 * 
 * Caveat - Does not work for episodes without subbed intro dialog, or intros with no dialog sequence
 */
var time_at_subtitle = function(subtitles, subtitle_line){
    var intro_end_regex = new RegExp('Dialogue: .*' + subtitle_line, 'g');
    // Match all the intro dialogue, optimization here for intro format with "{\i1}" (may be series specific)
    var intro_end_candidates = subtitles.match(intro_end_regex);
    var intro_end_dialog = intro_end_candidates[intro_end_candidates.length-1];
    // Subtitle format (We only care about end):
    // Format: Layer, Start, End, Name, ...
    var dialog_components = intro_end_dialog.split(',');
    // The first index will be occupied by Format and Layer
    var intro_end_time = dialog_components[2]; // End time as string, need to set video to time
    return to_seconds(intro_end_time);
}

/**
 * Finds bounds of two subtitles. I.E. Bounds of intro for element display and skip
 * @param {*} subtitles - Episode subtitles
 * @param {*} first - First line to find timestamp of (beginning of title sequence)
 * @param {*} last - Last line to find timestamp of (end of title sequence)
 */
var time_by_text = function(subtitles, first, last){
    start = time_at_subtitle(first);
    end = time_at_subtitle(last);
    console.log('Found intro bounds: ' + start + ' - ' + end);
    return [start, end];
}

/**
 *  Get intro by LSG (Longest Subtitle Gap)
 * @param {*} subtitles - Episode subtitles
 * 
 * Caveat - May skip critical sequences without subs/speech preceding and after intro
 */
var time_by_lsg = function(subtitles){
    var dialog_line_regex = new RegExp(/Dialogue:.*/g);
    var dialog_timestamps = subtitles.match(dialog_line_regex);
    // Only take subtitles on the 0 layer, as ancillary subs may interfere
    var timestamp_regex = new RegExp(/(?:\s0,)(\d+\:\d+\:\d+\.\d+,\d+\:\d+\:\d+\.\d+)/);
    var timestamps = [];
    for(var i = 0; i < dialog_timestamps.length; i++){
        // Get all timestamps. Convert to seconds
        console.log(dialog_timestamps[i])
        var timestamp_elements = timestamp_regex.exec(dialog_timestamps[i])[1].trim().split(',');
        timestamps.push(to_seconds(timestamp_elements[0]));
        timestamps.push(to_seconds(timestamp_elements[1]));
    }
    console.log(timestamps);
    // Find largest diff between all timestamps, sorted by default.
    var current_max = -1;
    var start, end = 0;
    for(var i = 0; i < timestamps.length; i++){
        // TODO: Half the subtitles is not half the length of an episode, need to get the average while calculating.
        // TODO: We can save iterations here as well performing the calculations in the previous loop
        if(i+1 >= timestamps.length || i > timestamps.length/2){
            break;
        }
        else {
            var diff = timestamps[i+1] - timestamps[i];
            if(diff > current_max){
                start = timestamps[i];
                end = timestamps[i+1];
                current_max = diff;
            }
        }
    }
    return [start, end];
}
