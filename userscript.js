// ==UserScript==
// @name                GitHub Internationalization
// @name:zh-CN          GitHub汉化插件
// @namespace           https://github.com/k1995/github-i18n-plugin/
// @version             0.2
// @description         Translate GitHub.com
// @description:zh-CN   GitHub汉化插件
// @author              k1995
// @match               https://github.com/*
// @grant               GM_xmlhttpRequest
// @require             https://raw.githubusercontent.com/k1995/github-i18n-plugin/master/locales/zh-CN.js
// @require             http://code.jquery.com/jquery-2.1.1.min.js
// @updateURL           https://raw.githubusercontent.com/k1995/github-i18n-plugin/master/userscript.js
// ==/UserScript==

(function() {
  'use strict';

  function translateElement(el) {
    // Get the text field name
    let k;
    if(el.tagName === "INPUT") {
      if (el.type === 'button' || el.type === 'submit') {
        k = 'value';
      } else {
        k = 'placeholder';
      }
    } else {
      k = 'data';
    }

    const txtSrc = el[k].trim();
    const key = txtSrc.toLowerCase()
        .replace(/\xa0/g, ' ') // replace '&nbsp;'
        .replace(/\s{2,}/g, ' ');

    if(txtSrc.startsWith("Sign")) {
      console.log(key);
      console.log(locales[key]);
    }
    if(locales[key]) {
      el[k] = el[k].replace(txtSrc, locales[key])
    }
  }

  function shoudTranslateEl(el) {
    const blockIds = ["readme"];
    const blockTags = ["CODE", "SCRIPT", "LINK", "IMG", "svg"];

    return !(el.id && blockIds.includes(el.id))
      && !(blockTags.includes(el.tagName));
  }

  function traverseElement(el) {
    if(!shoudTranslateEl(el)) {
      return
    }

    for(const child of el.childNodes) {
      if(child.nodeType === Node.TEXT_NODE) {
        translateElement(child);
      }
      else if(child.nodeType === Node.ELEMENT_NODE) {
        if(child.tagName === "INPUT") {
          translateElement(child);
        } else {
          traverseElement(child);
        }
      } else {
        // pass
      }
    }
  }

  function watchUpdate() {
    const m = window.MutationObserver || window.WebKitMutationObserver;
    const observer = new m(function (mutations, observer) {
      for(let mutationRecord of mutations) {
        for(let node of mutationRecord.addedNodes) {
          traverseElement(node);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      characterData: true,
      childList: true,
    });
  }

  // translate "about"
  function translateDesc() {
    $(".repository-content .f4").append("<br/>");
    $(".repository-content .f4").append("<a id='translate-me' href='#' style='color:rgb(27, 149, 224);font-size: small'>翻译</a>");
    $("#translate-me").click(function() {
      // get description text
      const desc = $(".repository-content .f4")
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

      if(!desc) {
        return;
      }

      GM_xmlhttpRequest({
        method: "GET",
        url: `https://www.githubs.cn/translate?q=`+ encodeURIComponent(desc),
        onload: function(res) {
          if (res.status === 200) {
            $("#translate-me").hide();
            // render result
            const text = res.responseText;
            $(".repository-content .f4").append("<span style='font-size: small'>由 <a target='_blank' style='color:rgb(27, 149, 224);' href='https://www.githubs.cn'>GitHub中文社区</a> 翻译👇</span>");
            $(".repository-content .f4").append("<br/>");
            $(".repository-content .f4").append(text);
          } else {
            alert("翻译失败");
          }
        }
      });
    });
  }

  traverseElement(document.body);
  translateDesc();
  watchUpdate();
})();