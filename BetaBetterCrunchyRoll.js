// ==UserScript==
// @name         BETA Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Skip for crunchyroll beta experience
// @author       James Perry
// @match        *://beta.crunchyroll.com/*
// @match        *://static.crunchyroll.com/*
// @updateURL    https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetaBetterCrunchyRoll.js
// @downloadURL  https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetaBetterCrunchyRoll.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var VIDEO = null
    var SUBTITLES = null
    var button_css = `
        .bettercrunchyroll-button {
            padding: 15px 40px;
            background-color: transparent;
            color: white;
            border-radius: 5px;
            border: 1px white solid;
            position: fixed;
            bottom: 50px;
            right: 100px;
            z-index: 100;
            visibility: hidden;
        }
         .bettercrunchyroll-button:hover {
              background-color: #f47521;
        }
        .bettercrunchyroll-button:active {
              background-color: #ffffff;
              color: black;
        }
    `

    /**
     * Converts a timestamp into seconds
     * @param {string} time - Timestamp in the format of 0:02:34.55
     */
    var to_seconds = function(time){
        var t = time.split(':');
        return (+t[0]) * 60 * 60 + (+t[1]) * 60 + (+t[2]);
    }


    /**
     * Performs skipping of intros by several methods
     * @param {String} url - Subtitles url
     */
    var intro_skip = function(url){
        console.info('BetterCrunchyroll: Downloading subs')
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'text';
        request.onload = function() {
            var subtitles = request.response;
            var intro_times = find_intro(subtitles);
            console.log('BetterCrunchyroll: Intro at: ' + intro_times[0] + ' - ' + intro_times[1]);
            var button_visible = false;
            var button_pressed = false;
            var styleSheet = document.createElement("style")
            styleSheet.type = "text/css"
            styleSheet.innerText = button_css
            document.head.appendChild(styleSheet)
            if(intro_times.length > 0){
                var skip_button = document.createElement("button");
                skip_button.innerText = "Skip"
                skip_button.classList.add('bettercrunchyroll-button')
                skip_button.style.setProperty('visibility', 'hidden');
                skip_button.addEventListener('click', function () {
                    VIDEO.currentTime = intro_times[1];
                    button_visible = false;
                    button_pressed = true;
                    skip_button.style.setProperty('visibility', 'hidden');
                })
                var body = document.getElementsByTagName('body')[0];
                body.appendChild(skip_button);
                let current_time
                var interval = setInterval(function(){
                    current_time = VIDEO.currentTime
                    if (current_time < 0){ return; }
                    if(intro_times[0] <= current_time && current_time < intro_times[1]){
                        if(!button_visible && !button_pressed){
                            button_visible = true;
                            skip_button.style.setProperty('visibility', 'visible');
                        }
                    } else{
                        button_visible = false;
                        skip_button.style.setProperty('visibility', 'hidden');
                    }
                    if(current_time > intro_times[1]){
                        button_visible = false
                        skip_button.style.setProperty('visibility', 'hidden');
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
            try {
                var timestamps = timestamp_regex.exec(dialog_timestamps[i]);
                var timestamp_elements = timestamps[1].trim().split(',');
            }
            catch {
                // No match, move on
                continue;
            }
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
        var end;
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
        if(longest_style_sequence > 7) {
            var style_sequence_length = longest_style_sequence[1] - longest_style_sequence[0]
            var lsg_length = end - start
            if(style_sequence_length > lsg_length && longest_style_sequence[1] < 300) {
                console.log('BetterCrunchyroll: Found intro by subtitle style');
                console.log(style_timestamps);
                return style_timestamps;
            }
        }
        console.log('BetterCrunchyroll: Found intro by LSG')
        return [start, end];
    }

    // Waits for subtitle URL to become available in the iframe context, from a message.
    var sub_check = () => {
        var subCheckInterval = setInterval(() => {
            if(!SUBTITLES) {return}
            intro_skip(SUBTITLES)
            clearInterval(subCheckInterval)
        }, 500)
    }

    // Broadcasts a message to the iframe window with the subtitle URL
    var broadcast = (frame, data) => {
        var broadcastInterval = setInterval(() => {
            frame.contentWindow.postMessage(data, '*');
        }, 500)

        setTimeout(() => {
            clearInterval(broadcastInterval)
        }, 10 * 1000)
    }

    // Waits for the video iframe to finish loading before starting to broadcast the subtitle info
    var startVideoCheck = (subs) => {
        var videoCheck = setInterval(() => {
            var frames = document.getElementsByClassName('video-player');
            if(frames.length > 0) {
                var frame = frames[0]
                if (frame.className.indexOf('loading') > -1) { return }
                broadcast(frame, {channel: 'bettercrunchyroll', url: subs['en-US'].url})
                console.info('BetterCrunchyroll: Found subtitles config')
                clearInterval(videoCheck)
            }
        }, 500)
    }

    // This script gets loaded in Crunchyrolls iframes. The main page can get the subs but not access the iframed video
    // and vice versa. We need to share the sub url to the page with the video element. This way the video can be
    // manipulated
    (function(open) {
        XMLHttpRequest.prototype.open = function() {
            this.addEventListener("readystatechange", function() {
                if(this.readyState === 4 && this.responseURL.indexOf('crunchyroll.com/cms') > -1){
                    try {
                        var data = JSON.parse(this.response)
                        SUBTITLES = data.subtitles
                        if(SUBTITLES) {
                            startVideoCheck(SUBTITLES)
                        }
                    } catch {
                    }
                }
            }, false);
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    // Listens to messages from the main window
    window.addEventListener('message', (e) => {
        if(e.data.channel === 'bettercrunchyroll') {
            SUBTITLES = e.data.url
        }
    })

    // Attempts to find the video player, works in video player iframe only
    var MAX_ATTEMPTS = 10;
    var attempts = 0
    var videoCheck = setInterval(() => {
        attempts += 1
        VIDEO = document.getElementById('player0')
        if(VIDEO) {
            console.info('BetterCrunchyroll: Found video')
            sub_check()
            clearInterval(videoCheck)
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(videoCheck)
        }
    }, 500)
})();
