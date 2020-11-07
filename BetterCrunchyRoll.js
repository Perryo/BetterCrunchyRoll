// ==UserScript==
// @name         Better Crunchyroll
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Makes crunchyroll videos better with streamlined controls
// @author       James Perry
// @match        https://www.crunchyroll.com/*
// @updateURL    TBD
// @downloadURL  TBD
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
        'height': '35px',
        'position': 'fixed',
        'width': '100%',
        'padding': '6px'
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

    var addStyleString = function(str){
        var node = document.createElement('style');
        node.innerHTML = str;
        document.body.appendChild(node);
    }

    var initVideo = function(video){
        console.log('BetterCrunchyroll: Adjusting video');
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

    var updateSubtitleCanvas = function(){
        if(!document.getElementById('velocity-canvas')){
            setTimeout(function(){
                updateSubtitleCanvas()
            }, 200);
        }
        else{
            document.getElementById('velocity-canvas').height = window.innerHeight-47;
            document.getElementById('velocity-canvas').width = window.innerWidth;
        }
    }

    var initHeader = function(){
        var header = $('<div/>');
        header.css(header_css);
        hideUnused();
        initUserPanel(header);
        initSearch(header);
        initDrawer(header)
        initQueueButton(header)
        $('body').prepend(header);
        $('body').css('background-color', 'black');
    }

    var initQueueButton = function(header) {
        var queue = $('#sharing_add_queue_button')
        queue.css(queue_css);
        header.append(queue);
    }

    var initUserPanel = function(header) {
        var panel = $('.header-userpanel');
        panel.find('.random').remove();
        panel.css(panel_css);
        panel.find('ul').css('padding', 0);
        header.append(panel)
    }

    var hideUnused = function() {
        $('#main_content').children().each(function(){
            if(this.id != 'showmedia-submenu' && this.id != 'showmedia_video'){
                $(this).css('display', 'none');
            }
        });
        $('#sidebar').css('display', 'none');
        $('#footer').css('display', 'none');
    }

    var initSearch = function(header){
        // Style search
        var search = $('#header_search_form')
        search.css(search_css);
        $('.header-searchbox').css(searchbox_css);
        // Inject search dropdown style
        addStyleString('.header-search-autocomplete { background-color: black; }');
        addStyleString('.header_search_result_type { color: rgb(206, 202, 202); }');
        addStyleString('.header_search_result_name { color: rgb(206, 202, 202); }');
        addStyleString('.header-search-autocomplete a:focus, .header-search-autocomplete a:hover, .header_search_autocomplete_item_focused { background-color: darkslategrey; outline: 0 none }');
        // Style crunchyroll header
        var logo = $('.header-logo');
        logo.css(logo_css);
        logo.click(function(){window.location.href=window.location.origin});
        header.append(logo);
        header.append(search);
    }

    var initDrawer = function(header){
        console.log('BetterCrunchyroll: Adjusting episode drawer');
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
        var drawer_container = $('<div">');
        // Style it
        //drawer_container.css('width', drawer.outerWidth());
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
        initArrows();
        // Add our work to the header
        header.append(drawer_container);
    }

    var initArrows = function(){
        // Style arrows
        $('.collection-carousel-arrow').each(function(){ $(this).css('background','none'); });
        addStyleString('.collection-carousel-arrow.disabled { visibility: hidden; }');
        var arrow = $('<span><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="13px" height="110px" viewBox="0 0 60 80" xml:space="preserve"><polyline fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" points="45.63,75.8 0.375,38.087 45.63,0.375 "></polyline></svg></span>');
        $('.collection-carousel-leftarrow').append(arrow.clone());
        $('.collection-carousel-rightarrow').append(arrow).css('transform','rotate(180deg)');
    }

    window.addEventListener("load", function(event) {
        console.log('BetterCrunchyroll: Initializing');
        var video = $('#showmedia_video_box');
        if(!video.length){
           video = $('#showmedia_video_box_wide');
        }
        if(video.length){
            initVideo(video);
            initHeader();
            console.log('BetterCrunchyroll: Done!');
        } else {
            console.log('BetterCrunchyroll: No video found');
        }
     });
})();
