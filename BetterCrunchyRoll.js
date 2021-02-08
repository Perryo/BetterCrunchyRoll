// ==UserScript==
// @name         Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Makes crunchyroll videos better with streamlined controls
// @author       James Perry
// @match        https://www.crunchyroll.com/*
// @updateURL    https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @downloadURL  https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var video_css = {
        'position': 'fixed',
        'left': 0,
        'z-index': 100,
        'height': 'calc(56.25vw)',
        'transform': 'translateY(-50%)',
        'top': '50%',
        'pointer-events': 'all'
    }

    var header_mouse_container_css = {
        'height': '20%',
        'pointer-events': 'all',
        'position': 'fixed',
        'z-index' : 100
    }

    var drawer_css = {
        'position': 'fixed',
        'top': 0,
        'right': 0,
        'z-index': 101,
        'padding': 0,
        'width': '0px',
        'transition': 'width .5s, padding .5s',
        'background-color': 'black',
        'margin-top': '47px',
        'display': 'block'
    }
    var carousel_css = {
        'opacity': 0,
        'transition': 'opacity .5s',
    }

    var header_css = {
        'background-color': 'transparent',
        'z-index': 102,
        'top': 0,
        'height': '34px',
        'position': 'fixed',
        'width': '100%',
        'padding': '13px 6px'
    }

    var container_css = {
        'height': '33px',
        'float': 'right',
        'width' : '175px',
        'line-height': '35px',
        'z-index': 102,
        'background-color': 'black',
        'text-align': 'center',
        'color': '#cecaca',
        'border': '.0625rem solid #cecaca',
        'border-radius': '.1875rem'
    }

    var search_css = {
        'float':'right',
        'background-color': 'black',
        'margin-right': '1rem'
    }
    var searchbox_css = {
        'background-color': 'black',
        'color': 'white'
    }

    var queue_css = {
        'margin': '.3rem 1rem .3rem 0'
    }

    var panel_css = {
        'z-index' : '102',
        'display': 'inline-block',
        'height': '35px',
        'float': 'right',
        'width': '100px',
        'margin-right': '1rem'
    }

    var logo_css = {
        'float': 'left',
        'margin-left': '3rem'
    }

    var button_css = {
        'padding': '10px 20px',
        'background-color': 'transparent',
        'color': 'white',
        'border-radius': '5px',
        'border': '1px white solid',
        'position': 'fixed',
        'bottom': '50px',
        'right': '100px',
        'z-index': 100,
        'display': 'none'
    }

    var CURRENT_TIME = -1;
    var VIDEO;

    var add_style_string = function(str){
        var node = document.createElement('style');
        node.innerHTML = str;
        document.body.appendChild(node);
    }

    var init_video = function(){
        console.info('BetterCrunchyroll: Adjusting video');
        VIDEO.css(video_css);

        VIDEO.css('width',window.innerWidth);
        VIDEO.css('max-height',window.innerHeight-60);
         var blackout = $('<div id="bc-blackout">');
        blackout.css('background', 'black');
        blackout.css('height', window.innerHeight);
        blackout.css('width', window.innerWidth);
        $('#template_scroller').prepend(blackout);
        // Resize the video when the screen is resized
        $(window).resize(function(){
            VIDEO.css('width',window.innerWidth);
            VIDEO.css('max-height',window.innerHeight-60);
            blackout.css('height', window.innerHeight);
            blackout.css('width', window.innerWidth);
            $('#bc-header-area').css('width', window.innerWidth);
        });

        // Hide scroll bar
        $('.main-page').css('overflow-y', 'hidden');
    }

    // TODO: Requires updates for subtitle resizing on initial page load
    var update_subtitle_canvas = function(){
        if(!document.getElementById('velocity-canvas')){
            setTimeout(function(){
                update_subtitle_canvas()
            }, 200);
        }
        else{
            document.getElementById('velocity-canvas').height = window.innerHeight-47;
            document.getElementById('velocity-canvas').width = window.innerWidth;
        }
    }

    var init_header = function(){
        var header = $('<div id="bc-header"/>');
        var header_mouse_event_container = $('<div id="bc-header-area"/>');
        header.css(header_css);
        header_mouse_event_container.css(header_mouse_container_css);
        header_mouse_event_container.css('width', window.innerWidth);
        setTimeout(function(){
            header.css('display', 'none');
        }, 5000);

        $('.site-header').css('display', 'none');
        $('.cr-expo-banner').css('display', 'none');
        var timer;
        var fadeInBuffer = false;
        var selectors = [document, header_mouse_event_container];
        // TODO: Need to detect video hover...
        $(selectors).mousemove(function() {
            if (!fadeInBuffer && timer) {
                clearTimeout(timer);
                timer = 0;

                $('#bc-header').css('display', 'block');
                $('html').css({
                    cursor: ''
                });
            } else {
                $('.html5gallery-box-0').css({
                    cursor: 'default'
                });
                fadeInBuffer = false;
            }

            timer = setTimeout(function() {
                $('#bc-header').css('display', 'none');
                $('.html5gallery-box-0').css({
                    cursor: 'none'
                });

                fadeInBuffer = true;
            }, 3000)
        });
        $('.html5gallery-box-0').css({
            cursor: 'default'
        });

        hide_unused();
        init_user_panel(header);
        init_search(header);
        init_drawer(header)
        init_queue_button(header)
        $('body').prepend(header);
        $('body').prepend(header_mouse_event_container);
        $('body').css('background-color', 'black');
    }

    var init_queue_button = function(header) {
        var queue = $('#sharing_add_queue_button')
        queue.css(queue_css);
        header.append(queue);
    }

    var init_user_panel = function(header) {
        var panel = $('.header-userpanel');
        panel.find('.random').remove();
        panel.css(panel_css);
        panel.find('ul').css('padding', 0);
        header.append(panel)
    }

    var hide_unused = function() {
        $('#main_content').children().each(function(){
            if(this.id != 'showmedia-submenu' && this.id != 'showmedia_video'){
                $(this).css('display', 'none');
            }
        });
        $('#sidebar').css('display', 'none');
        $('#footer').css('display', 'none');
    }

    var init_search = function(header){
        // Style search
        var search = $('#header_search_form')
        search.css(search_css);
        $('.header-searchbox').css(searchbox_css);
        // Inject search dropdown style
        add_style_string('.header-search-autocomplete { background-color: black; }');
        add_style_string('.header_search_result_type { color: rgb(206, 202, 202); }');
        add_style_string('.header_search_result_name { color: rgb(206, 202, 202); }');
        add_style_string('.header-search-autocomplete a:focus, .header-search-autocomplete a:hover, .header_search_autocomplete_item_focused { background-color: darkslategrey; outline: 0 none }');
        // Style crunchyroll header
        var logo = $('.header-logo');
        logo.css(logo_css);
        logo.click(function(){window.location.href=window.location.origin});
        header.append(logo);
        header.append(search);
    }

    var init_drawer = function(header){
        console.info('BetterCrunchyroll: Adjusting episode drawer');
        var collapsed = true;
        var drawer = $('.collection-carousel').parent();
        var drawer_width = drawer.css('width');
        var drawer_padding = drawer.css('padding');
        // Position and style drawer
        drawer.css(drawer_css)

        var carousel = $('.collection-carousel');
        // Hide carousel as it does not animate with height of drawer
        carousel.css(carousel_css);

        // Create a container to hold the drawer and handle click events
        var drawer_container = $('<div>');
        // Style it
        drawer_container.css(container_css);
        drawer_container.text('Expand Episodes');
        // Achieving a "Dark" theme here, set all the carousel items text to white
        $('a.block-link').each(function(){ $(this).css('color','white')});
        // Expand and collapse the drawer on click of the container
        drawer_container.click(function(){
            if(collapsed){
                collapsed = false;
                drawer_container.text('Collapse Episodes');
                drawer.css('width', drawer_width);
                drawer.css('padding', drawer_padding);
                carousel.css('opacity', '1');
                $('#bc-header-area').css('pointer-events', 'none');
            } else {
                collapsed = true;
                drawer_container.text('Expand Episodes');
                carousel.css('opacity', '0');
                drawer.css('width',0);
                drawer.css('padding', 0);
                $('#bc-header-area').css('pointer-events', 'all');
            }
        });
        init_arrows();
        // Add our work to the header
        header.append(drawer_container);
    }

    var init_arrows = function(){
        // Style arrows
        $('.collection-carousel-arrow').each(function(){ $(this).css('background','none'); });
        add_style_string('.collection-carousel-arrow.disabled { visibility: hidden; }');
        var arrow = $('<span><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="13px" height="110px" viewBox="0 0 60 80" xml:space="preserve"><polyline fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" points="45.63,75.8 0.375,38.087 45.63,0.375 "></polyline></svg></span>');
        $('.collection-carousel-leftarrow').append(arrow.clone());
        $('.collection-carousel-rightarrow').append(arrow).css('transform','rotate(180deg)');
    }

    /**
     * @author James Perry
     * An attempt at dynamically skipping anime intro sequences.
     *
     * At time of implementing subtiltes match the following format:
     * Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
     * Dialogue: 0,0:00:07.84,0:00:09.46,string,Acchan,0000,0000,0000,,string, string.
     */

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
     * @param {dictionary} metadata - Page metadata
     */
    var intro_skip = function(metadata){
        var request = new XMLHttpRequest();
        request.open('GET', metadata.subtitles[0].url);
        request.responseType = 'text';
        request.onload = function() {
            var subtitles = request.response;
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
    var first_sub = true;
    var length = lsg_timestamps.length/2; // We dont need to check all the subs, intros should be at the end of an episode
    for(var i = 0; i < length; i++){
        if(i+1 >= length || i > length){
            break;
        }
        else {
            // Intro may be before first subtitle, check first 5 seconds
            var start_diff;
            if (lsg_timestamps[i] > 5 && first_sub){
                start_diff = lsg_timestamps[i];
                first_sub = false;
            }
            var diff = lsg_timestamps[i+1] - lsg_timestamps[i];
            // First subtitle is before start of video, and difference is greater than next gap.
            // Use the gap at the start of the video before any subtitles are present
            if (start_diff && start_diff > diff && start_diff > current_max){
                start = 0;
                end = start_diff;
                current_max = start_diff
            }
            else if(diff > current_max){
                start = lsg_timestamps[i];
                end = lsg_timestamps[i+1];
                current_max = diff;
            }
        }
    }
    // Checking intro subtitles has more than x entries
    // This is arbitrary. Needs data, we just dont want false positives. 
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

    window.addEventListener('load', function(event) {
        console.info('BetterCrunchyroll: Initializing');
        VIDEO = $('#showmedia_video_box');
        if(!VIDEO.length){
           VIDEO = $('#showmedia_video_box_wide');
        }
        if(VIDEO.length){
            init_video();
            init_header();
            var metadata = null;
            var interval = setInterval(function(){
                try {
                    metadata = get_page_metadata()
                    intro_skip(metadata);
                    clearInterval(interval);
                }
                catch(err) {
                    console.info('BetterCrunchyroll: Page metadata not yet available, retrying.');
                }
            }, 1000);

            console.info('BetterCrunchyroll: Done!');
        } else {
            console.info('BetterCrunchyroll: No video found');
        }
     });
})();
