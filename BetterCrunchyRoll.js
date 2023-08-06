// ==UserScript==
// @name         BETA Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Intro Skip for crunchyroll
// @author       James Perry
// @match        *://www.crunchyroll.com/*
// @match        *://static.crunchyroll.com/*
// @updateURL    https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @downloadURL  https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @grant        none
// @run-at       document-start
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

    function isIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
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
     * Get intro by LSG
     * @param {*} subtitles - Episode Subtitles
     *
     * A normal subtitle looks something like:
     * Dialogue: 0,0:02:27.20,0:02:29.37,Default,,0000,0000,0000,,What is pi?
     */
    var find_intro = function(subtitles){
        var dialog_line_regex = new RegExp(/Dialogue:.*/g);
        var dialog_timestamps = subtitles.match(dialog_line_regex);
        var timestamp_regex = new RegExp(/(?:\s0,)(\d+\:\d+\:\d+\.\d+,\d+\:\d+\:\d+\.\d+)/);
        // Style variables
        var start = 0;
        var time_before_start = -1;
        var final_time_before_start = -1;
        // LSG variables
        var lsg_timestamps = [];
        // Only check half of episode subs
        for(var i = 0; i < dialog_timestamps.length/2; i++){
            // Get all timestamps
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
        }

        // LSG
        // Find largest diff between all timestamps, sorted by default.
        var current_max = -1;
        var end;
        var first_sub = true;
        var length = lsg_timestamps.length/2; // We dont need to check all the subs, intros should not be at the end of an episode.
        for(var i = 0; i < length; i++){
            if(i+1 >= length || i > length){
                break;
            }
            else {
                // Intro may be before first subtitle, check first 5 seconds.
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

    // Waits for the video iframe to finish loading before starting to broadcast the subtitle info to the iframe script.
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

    // ************************************************
    //             Runs in the main window
    // ************************************************
    if(!isIframe()) {
        // Intercept XHR requests to find response for sub URLS. Start check to make sure video is loaded.
        (function (open) {
            XMLHttpRequest.prototype.open = function () {
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4 && this.responseURL.indexOf('crunchyrollsvc') > -1 && this.responseURL.indexOf('play') > -1) {
                        try {
                            var data = JSON.parse(this.response)
                            SUBTITLES = data.subtitles
                            if (SUBTITLES) {
                                startVideoCheck(SUBTITLES)
                            }
                        } catch {
                            console.log('BetterCrunchyroll: Cannot find subtitle url')
                        }
                    }
                }, false);
                open.apply(this, arguments);
            };
        })(XMLHttpRequest.prototype.open);
    }

    // ************************************************
    //              Runs in the iframe
    // ************************************************
    if(isIframe()) {
        // Listens to messages from the main window, sets the subtitle URL for the sub title function.
        window.addEventListener('message', (e) => {
            if (e.data.channel === 'bettercrunchyroll') {
                SUBTITLES = e.data.url
            }
        })

        // Attempts to find the video player, works in video player iframe only
        var MAX_ATTEMPTS = 10;
        var attempts = 0
        var videoCheck = setInterval(() => {
            attempts += 1
            VIDEO = document.getElementById('player0')
            if (VIDEO) {
                console.info('BetterCrunchyroll: Found video')
                sub_check()
                clearInterval(videoCheck)
            } else if (attempts >= MAX_ATTEMPTS) {
                clearInterval(videoCheck)
            }
        }, 500)
    }
})();
