// ==UserScript==
// @name         Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      2.3
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
        'top': 47,
        'left': 0,
        'z-index': 100
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
        'background-color': 'black',
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
        'z-index': 100
    }

    var CURRENT_TIME = -1;

    var add_style_string = function(str){
        var node = document.createElement('style');
        node.innerHTML = str;
        document.body.appendChild(node);
    }

    var init_video = function(video){
        console.info('BetterCrunchyroll: Adjusting video');
        video.css(video_css);

        video.css('width',window.innerWidth);
        video.css('height',window.innerHeight-47);
        // Resize the video when the screen is resized
        $(window).resize(function(){
            video.css('width',window.innerWidth);
            video.css('height',window.innerHeight-47);
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
        var header = $('<div/>');
        header.css(header_css);
        hide_unused();
        init_user_panel(header);
        init_search(header);
        init_drawer(header)
        init_queue_button(header)
        $('body').prepend(header);
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
            } else {
                collapsed = true;
                drawer_container.text('Expand Episodes');
                carousel.css('opacity', '0');
                drawer.css('width',0);
                drawer.css('padding', 0);
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
        var start = time_at_subtitle(first);
        var end = time_at_subtitle(last);
        console.info('BetterCrunchyroll: Found intro bounds: ' + start + ' - ' + end);
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
            var timestamp_elements = timestamp_regex.exec(dialog_timestamps[i])[1].trim().split(',');
            timestamps.push(to_seconds(timestamp_elements[0]));
            timestamps.push(to_seconds(timestamp_elements[1]));
        }
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
        console.info('BetterCrunchyroll: Found intro bounds: ' + start + ' - ' + end);
        return [start, end];
    }

    window.addEventListener('load', function(event) {
        console.info('BetterCrunchyroll: Initializing');
        var video = $('#showmedia_video_box');
        if(!video.length){
           video = $('#showmedia_video_box_wide');
        }
        if(video.length){
            init_video(video);
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
