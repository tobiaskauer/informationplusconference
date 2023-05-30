window.onload = function() {
    
    /// random number function, min/max inclusive
    
    var randomNumber = function(min, max) {
        var number = Math.floor(Math.random() * (max - min +1) + min);
        return number;
    };
    
    var windowWidth = $(window).width();
    var windowHeight = $(window).height();
    var pageHeight = $(document).height();
    
    var mainWidth = $('main').outerWidth();
    var mainHeight = $('main').outerHeight();
    var asideWidth = windowWidth - mainWidth;
    var asideHeight = mainHeight;
    var networkHeight =  $('#network').outerHeight();
    var leftPadding = 10;
    
    $('aside').width(asideWidth)
        .height(asideHeight)
        .css('left', mainWidth + 'px');
    $('.nav-video').addClass('nav-link-active'); //video active on page load
    
    /// NAV ///
    
    var navOpen = true;
    
    if (windowWidth < 600) {
        var mobileNavClick = function() {
            if (navOpen == false) {
                $('.nav-link-container').css({'height':'440px'});
                $('.menu-button').addClass('menu-button-click');
                navOpen = true;
            } else if (navOpen == true) {
                $('.nav-link-container').css({'height':'0px'});
                $('.menu-button').removeClass('menu-button-click');
                navOpen = false;
            };
        };
        
        $('nav').click(mobileNavClick);
    }
    
    /// CREATE HEADER + NETWORK ///
    
    var columnWidth = $('.network-column').width();
    var networkCaptionWidth = columnWidth*2;
    var networkCaptionHeight = networkCaptionWidth * (360/640);
    var networkClicked = false;
    
    $('.network-caption').width(networkCaptionWidth + 'px');
    $('.network-video').css({'width':networkCaptionWidth + "px", 'height': networkCaptionHeight + 'px'});
    
    var svg = SVG('network-lines').size(mainWidth, networkHeight);
    var lineHeight = 11;
    var wordMargin = 5;
    
    var overNetworkItem = function() {
        if (windowWidth > 600) {
            if (networkClicked == false) {
                var hoverName = $(this).attr('id'); //get id of hovered item
                var hoverAll = $('[id='+hoverName+']'); //find all items with same id

                $(this).addClass('network-item-hover');//add class to selected network item
                $(".network-item").not(hoverAll).addClass('network-item-fade'); //fade all other network items

                $(hoverAll).each(function(i){ //for each network item
                    var currentTitle = $(this).siblings('.network-title'); //find sibling network title
                    currentTitle.addClass('network-title-hover'); //find title and apply hover class

                    if (i < hoverAll.length - 1) { //if there are more than one network title, draw line between them
                        var nextTitle = $(hoverAll[i+1]).siblings('.network-title');
                        var x1 = currentTitle[0].offsetWidth + currentTitle[0].offsetLeft + wordMargin + leftPadding;
                        var y1 = currentTitle[0].offsetTop + currentTitle[0].offsetHeight - lineHeight;
                        var x2 = nextTitle[0].offsetLeft - wordMargin + leftPadding;
                        var y2 = nextTitle[0].offsetTop + nextTitle[0].offsetHeight - lineHeight;
                        var line = svg.line(x1,y1,x2,y2);
                    };
                });

                $(".network-title").not('.network-title-hover').addClass('network-title-fade'); // fade all other network titles

                var speakerName = $(this).text();
                $('.network-caption-name').text(speakerName); // put title in caption text

                var speakerTitle = $(this).attr('data-title');
                $('.network-caption-title').text(speakerTitle); // put title in caption text

                var captionTop = $(this)[0].offsetTop - 1; //set caption top to under the hovered item
                $('.network-caption').css({'display':'block', 'top': captionTop + 'px', 'left': $(this)[0].offsetLeft + leftPadding + 'px'});

                var plusLeft = $(this)[0].offsetLeft - 41;
                var plusTop = $(this)[0].offsetTop - 5;
                $('.plus-sign').css({'top': plusTop + 'px', 'left': plusLeft + 'px'});
            };
        };
    };
    
    var outNetworkItem = function() {
        if (networkClicked == false) {
            $('line').remove(); //remove all drawn lines

            $(".network-item").not('.network-item-hover').removeClass('network-item-fade'); 
            $('.network-item-hover').removeClass('network-item-hover');

            $('.network-title-hover').removeClass('network-title-hover');
            $(".network-title").removeClass('network-title-fade');

            $('.network-caption').css({'display':'none'});
            
            $('.plus-sign').css({'transform': 'rotate(0deg)', 'color':'black', 'top': '50px', 'left': '154px'});
            $('.network-caption').css({'pointer-events':'none'}); //disable pointer effects to make animations smoother
        };
    };
    
    var halfOutNetworkItem = function() {            
        $('.plus-sign').css({'transform': 'rotate(0deg)', 'color':'black'});
        $('.network-caption').css({'pointer-events':'none'}); //disable pointer effects to make animations smoother
    };
    
    var clickNetworkItem = function() {
        if ($(this).hasClass('network-item-hover')) {
            if (networkClicked == false) {
                networkClicked = true;
                var videoLink = $(this).attr('data-video');
                if (videoLink.length == 0) {
                    $('.network-video').css({'opacity':'1'});
                    $('.coming-soon').css({'display':'block'});
                } else {
                    $('.network-video').attr('src', videoLink)
                        .css({'opacity':'1'});
                }
                $('.network-caption').css({'pointer-events':'auto'});
                $('.plus-sign').css({'transform': 'rotate(45deg)'});
            } else if (networkClicked == true) {
                networkClicked = false;
                $('.network-video').css({'opacity':'0'})
                    .removeAttr('src');
                $('.coming-soon').css({'display':'none'});
                $('.plus-sign').css({'transform': 'rotate(0deg)'});
                $('.network-caption').css({'pointer-events':'none'});
            };
        };
    };
    
    var closeNetworkItem = function() {
        if (networkClicked == true) {
            networkClicked = false;
            $('.network-video').css({'opacity':'0'})
                .removeAttr('src');
            outNetworkItem();
        };
    };
    
    var halfCloseNetworkItem = function() {
        if (networkClicked == true) {
            networkClicked = false;
            $('.network-video').css({'opacity':'0'})
                .removeAttr('src');
            halfOutNetworkItem();
        };
    };
    
    $('.mobile-item').each(function(){
        $(this).attr('data-open', 'false');
    });
    
    var clickMobileItem = function() {
        isOpen = $(this).attr('data-open');
        
        if (isOpen == 'false') {
            var videoLink = $(this).attr('data-video');
            var videoWidth = mainWidth - 40;
            var videoHeight = videoWidth * (360/640);
            if (videoLink.length == 0) {
                $(this).append("<div class='coming-soon-mobile' style='margin-top:10px;background:black;width:"+videoWidth+"px;height:"+videoHeight+"px'>COMING SOON</div>");
            } else {
                $(this).append("<iframe src='"+videoLink+"' style='margin-top:10px;background:black;' width='"+videoWidth+"' height='"+videoHeight+"' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>");
            };
            
            $(this).attr('data-open', true);
        } else if (isOpen == 'true') {
            $(this).find('iframe').remove();
            $('.coming-soon-mobile').remove();
            $(this).attr('data-open', 'false');
        }             
    };
    
    $('.network-item').mouseover(overNetworkItem);
    $('.network-item').mouseout(outNetworkItem);
    $('.mobile-item').click(clickMobileItem);
    $('.network-item').click(clickNetworkItem);
    $('.plus-sign').click(closeNetworkItem);
    $('.network-caption-name').click(halfCloseNetworkItem);
    $('.network-caption-title').click(halfCloseNetworkItem);
    
    /// CREATE SCHEDULE ///
    
    /// function to rotate image vertical position randomly
    
    var dayWidth = $('.day-one').width();
    var speakerImageMaxRotation = 20;
    var speakerImageMinRotation = -20;
    
    var randomRotateImage = function(image) {
        var speakerImageWidth = 100;
        var allowableWidth = dayWidth - speakerImageWidth; 
        var speakerImageRotation = randomNumber(speakerImageMinRotation, speakerImageMaxRotation);
        var speakerImageLeft = randomNumber(0, allowableWidth);
        $(image).css({'transform': 'rotate('+speakerImageRotation+'deg)', '-ms-transform': 'rotate('+speakerImageRotation+'deg)','-webkit-transform': 'rotate('+speakerImageRotation+'deg)', 'top' : '0px', 'left' : speakerImageLeft + 'px', 'width': '100px'});
    };
    
    // sets each speakerOpen to false upon loading
    $('.speaker').each(function(){
        $(this).attr('data-speakerOpen', 'false');
    });
    
    // rotates each image upon loading
    $('.speaker-image').each(function(){
        randomRotateImage(this);
    });
    
    $('.speaker').on('click', function(){
        
        var speakerHeight = $(this).height();
        var speakerHiddenOpen = $(this).attr('data-speakerOpen');
        var speakerImage = $(this).find('.speaker-image');
        var speakerImageName = speakerImage.attr('name');
        var speakerImageSrc = $(this).find('img');
        var speakerHidden = $(this).find('.speaker-hidden');
        var speakerHiddenHeight = $(speakerHidden)[0].scrollHeight; //get height of speaker-info to set as height to allow animation
        
        //create temporary image to get height if width is 200px
        tempImage = speakerImageSrc.clone();
        tempImage.css({'width':'200px','height':'auto'});
        $('.temp-image').append(tempImage);
        var speakerImageHeight = tempImage.height();
        tempImage.remove();
        
        if (speakerHiddenOpen === 'false') { //if speaker is closed and clicked upon
            speakerHidden.css({'height': speakerHiddenHeight +'px', 'margin-top': speakerImageHeight + 8 + 'px'}); //adjust height of hidden div to show and animate
            speakerImageSrc.attr('src', 'speakers/speaker-images/' + speakerImageName); //change image source
            if ($(this).parent('.lightning').length > 0) { //if inside lighting
                speakerImage.css({'top': speakerHeight + 'px', 'left': '87px', 'width':'200px', 'margin-top':'12px', 'transform': 'rotate(0deg)', '-ms-transform': 'rotate(0deg)', '-webkit-transform': 'rotate(0deg)', 'z-index': '0', 'opacity':'1'}); 
            } else {
                speakerImage.css({'top': speakerHeight + 'px', 'left': '70px', 'width':'200px', 'margin-top':'12px', 'transform': 'rotate(0deg)', '-ms-transform': 'rotate(0deg)', '-webkit-transform': 'rotate(0deg)', 'z-index': '0', 'opacity':'1'}); 
            }
            $(this).attr('data-speakerOpen', 'true'); //set data-speakerOpen to true;
        } else if (speakerHiddenOpen === 'true') { //if speaker is open and clicked upon
            speakerHidden.css({'height': '0px', 'margin-top': '0px'});
            randomRotateImage(speakerImage);
            speakerImage.css({'z-index': '-1', 'margin-top':'0px', 'opacity':'0.2'});
            speakerImageSrc.attr('src', 'speakers/speaker-images-yellow/' + speakerImageName);
            $(this).attr('data-speakerOpen', 'false');
        }
        
    });
    
    $('.speaker').on('mouseenter', function() {
        var speakerHiddenOpen = $(this).attr('data-speakerOpen');
        if (speakerHiddenOpen === 'false') {
            var speakerImage = $(this).find('.speaker-image');
            var speakerImageName = speakerImage.attr('name');
            var speakerImageSrc = $(this).find('img');
            speakerImage.css({'z-index': '1', 'opacity':'1'});
        };
    });
    
    $('.speaker').on('mouseleave', function() {
        var speakerHiddenOpen = $(this).attr('data-speakerOpen');
        if (speakerHiddenOpen === 'false') {
            var speakerImage = $(this).find('.speaker-image');
            speakerImage.css({'z-index': '-1', 'opacity':'0.2'});
        };
    });
    
    /// EXHIBITION ///
    
    $('.exhibition-section').each(function(){
        $(this).attr('data-exhibit-open', 'false');
    });
    
    $('.exhibition-section').on('click', function(){
        var exhibitOpen = $(this).attr('data-exhibit-open');
        var exhibitBrief = $(this).find('.exhibition-brief');
        if (exhibitOpen == 'false') {
            var exhibitBriefHeight = $(exhibitBrief)[0].scrollHeight; //get height of exhibit to set as height to allow animation
            exhibitBrief.css({'height': exhibitBriefHeight +'px', 'margin-top':'10px'});
            $(this).attr('data-exhibit-open', 'true');
        } else if (exhibitOpen == 'true') {
            exhibitBrief.css({'height': '0px', 'margin-top':'0px'});
            $(this).attr('data-exhibit-open', 'false');
        };
    });
    
    /// TWITTER ///
    
    var twitterConfig = {
      "id": '738412215053766656',
      "domId": 'twitter-feed-content',
      "maxTweets": 10,
      "enableLinks": true,
      'showInteraction': true,
    };
    
    twitterFetcher.fetch(twitterConfig);
    
    $('.twitter-feed').attr('data-open', 'false');
    
    $('.tweets-button').on('click', function(){
        if ($('.twitter-feed').attr('data-open') == 'false') {
            $('.twitter-feed').css({'display':'block'})
                .attr('data-open', 'true');
        } else {
            $('.twitter-feed').css({'display':'none'})
                .attr('data-open', 'false');
        };
    });
    
    // CREATE PHOTOS ///
    
    var asideImageArray = [];
    var imageName;
    var imageIndex = 0;
    
    var netImages = ['main_1.jpg','main_2.jpg','main_3.jpg','main_4.jpg','main_5.jpg','main_6.jpg','main_7.jpg','main_8.jpg','main_9.jpg','main_10.jpg','main_11.jpg','main_12.jpg','main_13.jpg','main_14.jpg','main_15.jpg','main_16.jpg','main_17.jpg','main_18.jpg','main_19.jpg'];
    
    var schedImages = ['sched_1.jpg','sched_2.jpg','sched_3.jpg','sched_4.jpg','sched_5.jpg','sched_6.jpg','sched_7.jpg','sched_8.jpg','sched_9.jpg','sched_10.jpg','sched_11.jpg','sched_12.jpg','sched_13.jpg','sched_14.jpg','sched_15.jpg','sched_16.jpg','sched_17.jpg','sched_18.jpg','sched_19.jpg','sched_20.jpg','sched_21.jpg','sched_22.jpg','sched_23.jpg','sched_24.jpg','sched_25.jpg','sched_26.jpg','sched_27.jpg','sched_28.jpg','sched_29.jpg','sched_30.jpg','sched_31.jpg','sched_32.jpg'];
    
    var exImages =['ex_1.jpg','ex_2.jpg','ex_3.jpg','ex_4.jpg','ex_5.jpg','ex_6.jpg','ex_7.jpg','ex_8.jpg','ex_9.jpg','ex_10.jpg','ex_11.jpg','ex_12.jpg','ex_13.jpg','ex_14.jpg','ex_15.jpg','ex_16.jpg','ex_17.jpg'];
    
    var workImages = ['work_1.jpg','work_2.jpg','work_3.jpg','work_4.jpg','work_5.jpg','work_6.jpg','work_7.jpg','work_8.jpg','work_9.jpg','work_10.jpg','work_11.jpg','work_12.jpg','work_13.jpg','work_15.jpg','work_16.jpg','work_17.jpg','work_18.jpg','work_19.jpg','work_20.jpg'];
    
    var randomImages = function(){
        $('.image-network').each(function(){
            var randomNum = randomNumber(0, netImages.length - 1);
            $(this).attr('src', 'images/preview/' + netImages[randomNum]);
            netImages.splice(randomNum, 1);
        });
        $('.image-schedule').each(function(){
            var randomNum = randomNumber(0, schedImages.length - 1);
            $(this).attr('src', 'images/preview/' + schedImages[randomNum]);
            schedImages.splice(randomNum, 1);
        });
        $('.image-exhibition').each(function(){
            var randomNum = randomNumber(0, exImages.length - 1);
            $(this).attr('src', 'images/preview/' + exImages[randomNum]);
            exImages.splice(randomNum, 1);
        });
        $('.image-workshop').each(function(){
            var randomNum = randomNumber(0, workImages.length - 1);
            $(this).attr('src', 'images/preview/' + workImages[randomNum]);
            workImages.splice(randomNum, 1);
        });
    };

    var getImageNames = function() {
        $.ajax({
            url:'getNames.php',
            dataType: 'html',
            type: 'POST',
            success: function(response) {
                asideImageArray = JSON.parse(response);
                cleanImageNames();
        }});
    };

    var cleanImageNames = function() {
        var i = asideImageArray.length;
        while (i--) {
            if (asideImageArray[i].length < 8) {
                asideImageArray.splice(i, 1);
            };
        };
    };

    getImageNames();
    randomImages();
    
    /// WINDOW WIDTH FUNCTIONS ///
    
    if (windowWidth > 600) {
        
        var networkTop = $('#network')[0].offsetTop;
        var scheduleTop = $('#schedule')[0].offsetTop;
        var exhibitionTop = $('#exhibition')[0].offsetTop;
        var workshopTop = $('#workshop')[0].offsetTop;
        var twitterTop = $('#twitter')[0].offsetTop;

        var imageBleed = -20;
        var imageMaxRotation = 10;
        var imageMinRotation = -10;

        var ImageRandom = function(image, top, bottom) {
            var imageHeight = 133.25213154689;
            var imageWidth= 200;
            var imageRotation = randomNumber(imageMinRotation, imageMaxRotation);
            var imageTop = randomNumber(top, bottom - imageHeight);
            if (imageWidth < asideWidth) {
                var imageLeft = randomNumber(imageBleed, asideWidth - imageWidth - imageMaxRotation);
            } else {
                var imageLeft = randomNumber(imageBleed, asideWidth - imageMaxRotation);
            };
            $(image).css({'transform': 'rotate('+imageRotation+'deg)', '-ms-transform': 'rotate('+imageRotation+'deg)','-webkit-transform': 'rotate('+imageRotation+'deg)', 'width':imageWidth + 'px', 'top': imageTop + 'px', 'left': imageLeft + 'px', 'z-index': '0'});
        };
        
        var imageClick = function(event) {
            if ($('aside').hasClass('aside-open')) { //if image is open, close image
                $('.back-button, .for-button').css('opacity','0');
                $('aside').removeClass('aside-open')
                    .css({'width':asideWidth + 'px', 'left':mainWidth + 'px'});
    
                ImageRandom($('.image-preview-open'), $(document).scrollTop(), $(document).scrollTop() + windowHeight);
                $('.image-preview-open').attr('src', 'images/preview/' + imageName)
                    .removeClass('image-preview-open');
            } else { //if image is closed, open image
                imageName = $(this).attr('src').substring(15);
                imageIndex = asideImageArray.indexOf(imageName);
                
                if (windowWidth < 900) {
                    $(this).addClass('image-preview-open')
                        .css({'top': $(document).scrollTop() + 'px', 'left':'0', 'width': windowWidth + 'px','transform': 'rotate(0deg)', '-ms-transform': 'rotate(0deg)','-webkit-transform': 'rotate(0deg)',  'z-index': '1'})
                        .attr('src', 'images/gallery/' + imageName);
                } else { 
                    $(this).addClass('image-preview-open')
                        .css({'top': $(document).scrollTop() + 'px', 'left':'0', 'width':'900px','transform': 'rotate(0deg)', '-ms-transform': 'rotate(0deg)','-webkit-transform': 'rotate(0deg)',  'z-index': '1'})
                        .attr('src', 'images/gallery/' + imageName);
                };
                
                $('aside').addClass('aside-open')
                    .css({'width':windowWidth + 'px', 'left':'0'});
                $('.back-button, .for-button').css('opacity','1');
                event.stopPropagation();
            };
        };
        
        var asideClick = function() {
            if ($('aside').hasClass('aside-open')) { //if image is open, close image
                $('.back-button, .for-button').css('opacity','0');
                $('aside').removeClass('aside-open')
                    .css({'width':asideWidth + 'px', 'left':mainWidth + 'px'});
                
                ImageRandom($('.image-preview-open'), $(document).scrollTop(), $(document).scrollTop() + windowHeight);
                $('.image-preview-open').attr('src', 'images/preview/' + imageName)
                    .removeClass('image-preview-open');
            };
        };
        
        var forClick = function(event) {
            imageIndex++;
            if (imageIndex > asideImageArray.length - 1) {
                imageIndex = 0;
            }
            $('.image-preview-open').attr('src', 'images/gallery/' + asideImageArray[imageIndex]);
            event.stopPropagation();
        };

        var backClick = function(event) {
            imageIndex--;
            if (imageIndex < 0) {
                imageIndex = asideImageArray.length - 1;
            }
            $('.image-preview-open').attr('src', 'images/gallery/' + asideImageArray[imageIndex]);
            event.stopPropagation();
        };

        $('.image-network').each(function(){ImageRandom($(this), networkTop, scheduleTop)});
        $('.image-schedule').each(function(){ImageRandom($(this), scheduleTop, exhibitionTop)});
        $('.image-exhibition').each(function(){ImageRandom($(this), exhibitionTop, workshopTop)});
        $('.image-workshop').each(function(){ImageRandom($(this), workshopTop, twitterTop)});
        $('.image-preview').on('click', imageClick);
        $('aside').on('click', asideClick);
        $('.for-button').on('click', forClick);
        $('.back-button').on('click', backClick);
    };
    
    if (windowWidth < 600) {
        var forClick = function(event) {
            imageIndex++;
            if (imageIndex > asideImageArray.length - 1) {
                imageIndex = 0;
            }
            $('.mobile-image').attr('src', 'images/gallery/' + asideImageArray[imageIndex]);
        };

        var backClick = function(event) {
            imageIndex--;
            if (imageIndex < 0) {
                imageIndex = asideImageArray.length - 1;
            }
            $('.mobile-image').attr('src', 'images/gallery/' + asideImageArray[imageIndex]);
        };
        
        $('.mobile-for').on('click', forClick);
        $('.mobile-back').on('click', backClick);
    };
    
    /// SCROLLING FUNCTIONS ///
    
    // if window is scrolled after load
    
    window.onscroll = function() {
        
        var currentScroll = $(window).scrollTop();
        
        if (currentScroll >= 0 && currentScroll < $('#network')[0].offsetTop + $('#network')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-video').addClass('nav-link-active');
        } else if (currentScroll >= $('#schedule')[0].offsetTop && currentScroll < $('#schedule')[0].offsetTop + $('#schedule')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-schedule').addClass('nav-link-active');
        } else if (currentScroll >= $('#exhibition')[0].offsetTop && currentScroll < $('#exhibition')[0].offsetTop + $('#exhibition')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-exhibition').addClass('nav-link-active');
        } else if (currentScroll >= $('#workshop')[0].offsetTop && currentScroll < $('#workshop')[0].offsetTop + $('#workshop')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-workshop').addClass('nav-link-active');
        } else if (currentScroll >= $('#twitter')[0].offsetTop && currentScroll < $('#twitter')[0].offsetTop + $('#twitter')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-twitter').addClass('nav-link-active');
        } else if (currentScroll >= $('#about')[0].offsetTop && currentScroll < $('#about')[0].offsetTop + $('#about')[0].offsetHeight) {
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-about').addClass('nav-link-active');
        };
        
        if ($('.image-preview-open').length) {
            $('.image-preview-open').css({'top': currentScroll + 'px'})
        };
        
        /// Navigation change to sticky upon scroll
        
        if ($(this).scrollTop() > 0) {
            $('.nav-background').addClass('nav-background-min');
        } else {
            $('.nav-background').removeClass('nav-background-min');
        };
        
        /// On mobile 
        
        if (windowWidth < 600) {
            if (navOpen == true) {
                $('.nav-link-container').css({'height':'0px'});
                $('.menu-button').removeClass('menu-button-click');
                navOpen = false;
            };
        };
        
    };
    
    /// RESIZE FUNCTIONS ///
    
    var resizeTimer;
    
    window.onresize = function() {
        
        windowWidth = $(window).width();
        windowHeight = $(window).height();
        pageHeight = $(document).height();
        
        mainWidth = $('main').outerWidth();
        mainHeight = $('main').outerHeight(true);
        asideWidth = windowWidth - mainWidth;
        asideHeight = mainHeight;

        $('aside').width(asideWidth)
            .height(asideHeight);
        
        /// execute after resizing complete
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            
            if (windowWidth > 600) {
                networkTop = $('#network')[0].offsetTop;
                scheduleTop = $('#schedule')[0].offsetTop;
                exhibitionTop = $('#exhibition')[0].offsetTop;
                workshopTop = $('#workshop')[0].offsetTop;
                aboutTop = $('#about')[0].offsetTop;
                
                $('.image-network').each(function(){ImageRandom($(this), networkTop, scheduleTop)});
                $('.image-schedule').each(function(){ImageRandom($(this), scheduleTop, exhibitionTop)});
                $('.image-exhibition').each(function(){ImageRandom($(this), exhibitionTop, workshopTop)});
                $('.image-workshop').each(function(){ImageRandom($(this), workshopTop, aboutTop)});
                $('.image-about').each(function(){ImageRandom($(this), aboutTop, pageHeight)});
            };
            
        }, 250);
    };
    
};