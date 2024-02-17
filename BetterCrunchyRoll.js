// ==UserScript==
// @name         Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Intro Skip for crunchyroll
// @author       James Perry
// @match        *://crunchyroll.com/*
// @match        *://www.crunchyroll.com/*
// @match        *://static.crunchyroll.com/*
// @updateURL    https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @downloadURL  https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    let VIDEO = null
    let SUBTITLES = null
    let SKIP_BUTTON = null
    let SKIP_INTERVAL = null
    const button_css = `
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
    const to_seconds = function(time){
        const t = time.split(':');
        return (+t[0]) * 60 * 60 + (+t[1]) * 60 + (+t[2]);
    }

    /**
     * Used to execute specific logic for i-framed video elements vs main window elements
     */
    function isIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }


    /**
     * Performs skipping of intros by checking time gaps in the downloaded subtitles
     * @param {String} url - Subtitles url
     */
    const intro_skip = function(url){
        console.info('BetterCrunchyroll: Downloading subs')
        const request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'text';
        request.onload = function() {
            const subtitles = request.response;
            const intro_times = find_intro(subtitles);
            console.log('BetterCrunchyroll: Intro at: ' + intro_times[0] + ' - ' + intro_times[1]);
            let button_visible = false;
            let button_pressed = false;
            const styleSheet = document.createElement("style")
            styleSheet.type = "text/css"
            styleSheet.innerText = button_css
            document.head.appendChild(styleSheet)
            if(intro_times.length > 0){
                SKIP_BUTTON = document.createElement("button");
                SKIP_BUTTON.innerText = "Skip"
                SKIP_BUTTON.classList.add('bettercrunchyroll-button')
                SKIP_BUTTON.style.setProperty('visibility', 'hidden');
                SKIP_BUTTON.addEventListener('click', function () {
                    VIDEO.currentTime = intro_times[1];
                    button_visible = false;
                    button_pressed = true;
                    SKIP_BUTTON.style.setProperty('visibility', 'hidden');
                    SKIP_BUTTON.remove()
                })
                const body = document.getElementsByTagName('body')[0];
                body.appendChild(SKIP_BUTTON);
                let current_time
                SKIP_INTERVAL = setInterval(function(){
                    current_time = VIDEO.currentTime
                    if (current_time < 0){ return; }
                    if(intro_times[0] <= current_time && current_time < intro_times[1]){
                        if(!button_visible && !button_pressed){
                            button_visible = true;
                            SKIP_BUTTON.style.setProperty('visibility', 'visible');
                        }
                    } else{
                        button_visible = false;
                        SKIP_BUTTON.style.setProperty('visibility', 'hidden');
                    }
                    if(current_time > intro_times[1]){
                        button_visible = false
                        SKIP_BUTTON.style.setProperty('visibility', 'hidden');
                        clearInterval(SKIP_INTERVAL);
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
    const find_intro = function(subtitles){
        const dialog_line_regex = new RegExp(/Dialogue:.*/g);
        const dialog_timestamps = subtitles.match(dialog_line_regex);
        const timestamp_regex = new RegExp(/(?:\s0,)(\d+\:\d+\:\d+\.\d+,\d+\:\d+\:\d+\.\d+)/);
        // Style variables
        let start = 0;
        // LSG variables
        const lsg_timestamps = [];
        // Only check half of episode subs
        for(let i = 0; i < dialog_timestamps.length/2; i++){
            // Get all timestamps
            try {
                const timestamps = timestamp_regex.exec(dialog_timestamps[i]);
                const timestamp_elements = timestamps[1].trim().split(',');
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
        let current_max = -1;
        let end;
        let first_sub = true;
        const length = lsg_timestamps.length/2; // We dont need to check all the subs, intros should not be at the end of an episode.
        for(let i = 0; i < length; i++){
            if(i+1 >= length || i > length){
                break;
            }
            else {
                // Intro may be before first subtitle, check first 5 seconds.
                let start_diff;
                if (lsg_timestamps[i] > 5 && first_sub){
                    start_diff = lsg_timestamps[i];
                    first_sub = false;
                }
                const diff = lsg_timestamps[i+1] - lsg_timestamps[i];
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

    /**
     * Broadcasts a message to the iframe window with the subtitle URL
     * @param frame - Frame to post a message into
     * @param data - Data to post
     */
    const broadcast = (frame, data) => {
        setTimeout(() => {
            frame.contentWindow.postMessage(data, '*');
        }, 2000)
    }


    /**
     * Waits for the video iframe to finish loading before starting to broadcast the subtitle info to the iframe script.
     * @param subs - URL of the subtitles, pulled from listening to the config API calls on the main window
     */
    const startVideoCheck = (subs) => {
        const videoCheck = setInterval(() => {
            const frames = document.getElementsByClassName('video-player');
            if(frames.length > 0) {
                const frame = frames[0]
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
                            const data = JSON.parse(this.response)
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
    const getVideo = () => {
        // Attempts to find the video player so the current time can be checked, and fast forwarded.
        const MAX_ATTEMPTS = 10;
        let attempts = 0
        const videoCheck = setInterval(() => {
            attempts += 1
            VIDEO = document.getElementById('player0')
            if (VIDEO) {
                console.info('BetterCrunchyroll: Found video')
                clearInterval(videoCheck)
            } else if (attempts >= MAX_ATTEMPTS) {
                clearInterval(videoCheck)
            }
        }, 500)
    }
    if(isIframe()) {
        // Listens to messages from the main window, sets the subtitle URL for the sub title function.
        window.addEventListener('message', (e) => {
            if (e.data.channel === 'bettercrunchyroll') {
                // Check video before to make sure we can control skipping. Checking here ensures the subs rerun
                // when they change, like on Single-SPA path change.
                SUBTITLES = e.data.url
                getVideo()
                const videoReady = setInterval(() => {
                    if(!VIDEO) {return}
                    intro_skip(SUBTITLES)
                    clearInterval(videoReady)
                }, 500)
            }
        })

    }
})();
