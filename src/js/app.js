// Override console.log gracefully
// see: http://stackoverflow.com/questions/9164976/why-do-i-get-maximum-call-stack-size-exceeded-when-i-override-console-log
console.log = function (log) {
    return function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(new Date().getTime().toString().substr(7, 6)); // Push millis as first argument
        if (window.hasOwnProperty('postMessageToHost')) {
          window.postMessageToHost(JSON.stringify({event:'WKWebViewLog',data:args.join(' - ')}));
        } else {
          log.apply(console, args);
        }
    };
}(console.log);


function fireEvent(_msg) {  
  if (window.hasOwnProperty('postMessageToHost')) {
    window.postMessageToHost(JSON.stringify(_msg));
  } else {
    console.log({fireEvent:_msg.event,data:_msg.data});
  }
}

function isElementInViewport (el) {
    var rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&     
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function getPosition(e) {
  var posx = 0;
  var posy = 0;
 
  if (!e) var e = window.event;

  return {
    x: e.clientX,
    y: e.clientY
  }
}


window.onerror = function(errorMsg, url, lineNumber) {
  var str = errorMsg + ' Script: ' + url + ' Line: ' + lineNumber;
  if (window.hasOwnProperty('postMessageToHost')) {
    window.postMessageToHost(JSON.stringify({event:'WKWebViewError',data:str}));
  } else {
    console.log(str);
  }
}

var exampleSocket = new WebSocket("ws://127.0.0.1:8081");
exampleSocket.onmessage = function (event) {
  console.log('received event..');
  switch(event.data) {
    case 'reload':
      location.reload();
      break;
    default:
      console.log(event.data);
  }
};

Element.prototype.isVisible = function() {
 
    'use strict';
 
    /**
     * Checks if a DOM element is visible. Takes into
     * consideration its parents and overflow.
     *
     * @param (el)      the DOM element to check if is visible
     *
     * These params are optional that are sent in recursively,
     * you typically won't use these:
     *
     * @param (t)       Top corner position number
     * @param (r)       Right corner position number
     * @param (b)       Bottom corner position number
     * @param (l)       Left corner position number
     * @param (w)       Element width number
     * @param (h)       Element height number
     */
    function _isVisible(el, t, r, b, l, w, h) {
        var p = el.parentNode,
                VISIBLE_PADDING = 2;
 
        if ( !_elementInDocument(el) ) {
            return false;
        }
 
        //-- Return true for document node
        if ( 9 === p.nodeType ) {
            return true;
        }
 
        //-- Return false if our element is invisible
        if (
             '0' === _getStyle(el, 'opacity') ||
             'none' === _getStyle(el, 'display') ||
             'hidden' === _getStyle(el, 'visibility')
        ) {
            return false;
        }
 
        if (
            'undefined' === typeof(t) ||
            'undefined' === typeof(r) ||
            'undefined' === typeof(b) ||
            'undefined' === typeof(l) ||
            'undefined' === typeof(w) ||
            'undefined' === typeof(h)
        ) {
            t = el.offsetTop;
            l = el.offsetLeft;
            b = t + el.offsetHeight;
            r = l + el.offsetWidth;
            w = el.offsetWidth;
            h = el.offsetHeight;
        }
        //-- If we have a parent, let's continue:
        if ( p ) {
            //-- Check if the parent can hide its children.
            if ( ('hidden' === _getStyle(p, 'overflow') || 'scroll' === _getStyle(p, 'overflow')) ) {
                //-- Only check if the offset is different for the parent
                if (
                    //-- If the target element is to the right of the parent elm
                    l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
                    //-- If the target element is to the left of the parent elm
                    l + w - VISIBLE_PADDING < p.scrollLeft ||
                    //-- If the target element is under the parent elm
                    t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
                    //-- If the target element is above the parent elm
                    t + h - VISIBLE_PADDING < p.scrollTop
                ) {
                    //-- Our target element is out of bounds:
                    return false;
                }
            }
            //-- Add the offset parent's left/top coords to our element's offset:
            if ( el.offsetParent === p ) {
                l += p.offsetLeft;
                t += p.offsetTop;
            }
            //-- Let's recursively check upwards:
            return _isVisible(p, t, r, b, l, w, h);
        }
        return true;
    }
 
    //-- Cross browser method to get style properties:
    function _getStyle(el, property) {
        if ( window.getComputedStyle ) {
            return document.defaultView.getComputedStyle(el,null)[property];
        }
        if ( el.currentStyle ) {
            return el.currentStyle[property];
        }
    }
 
    function _elementInDocument(element) {
        while (element = element.parentNode) {
            if (element == document) {
                    return true;
            }
        }
        return false;
    }
 
    return _isVisible(this);
 
};