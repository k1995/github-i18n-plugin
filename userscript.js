// ==UserScript==
// @name                GitHub Internationalization
// @name:zh-CN          GitHub汉化插件
// @name:ja             GitHub日本語
// @namespace           https://github.com/k1995/github-i18n-plugin/
// @version             0.17
// @description         Translate GitHub.com
// @description:zh      GitHub汉化插件，包含人机翻译
// @description:zh-CN   GitHub汉化插件，包含人机翻译
// @description:ja      GitHub日本語プラグイン
// @author              k1995
// @match               https://github.com/*
// @match               https://gist.github.com/*
// @grant               GM_xmlhttpRequest
// @grant               GM_getResourceText
// @resource            zh-CN https://www.githubs.cn/raw-githubusercontent/k1995/github-i18n-plugin/master/locales/zh-CN.json?v=20210407
// @resource            ja https://www.githubs.cn/raw-githubusercontent/k1995/github-i18n-plugin/master/locales/ja.json
// @require             https://cdn.bootcss.com/timeago.js/4.0.2/timeago.full.min.js
// @require             https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// ==/UserScript==

(function() {
  'use strict';

  const SUPPORT_LANG = ["zh-CN", "ja"];
  const lang = (navigator.language || navigator.userLanguage);
  const locales = getLocales(lang)

  translateByCssSelector();  
  traverseElement(document.body);
  watchUpdate();

  // 翻译描述
  if(window.location.pathname.split('/').length == 3) {
    translateDesc(".repository-content .f4"); //仓库简介翻译
    translateDesc(".gist-content [itemprop='about']"); // Gist 简介翻译
  }


  function getLocales(lang) {
    if(lang.startsWith("zh")) { // zh zh-TW --> zh-CN
      lang = "zh-CN";
    }
    if(SUPPORT_LANG.includes(lang)) {
      return JSON.parse(GM_getResourceText(lang));
    }
    return {
      css: [],
      dict: {}
    };
  }

  function translateRelativeTimeEl(el) {
    const datetime = $(el).attr('datetime');
    $(el).text(timeago.format(datetime, lang.replace('-', '_')));
  }

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
    if (locales.dict[key]) {
      el[k] = el[k].replace(txtSrc, locales.dict[key])
    } else {
      // 正则翻译(实验)
      var str; // 翻译结果
      var res; // 正则数组

      var rePagePath=locales.rePagePath // URL匹配规则
      var child = document.URL.replace(new RegExp(rePagePath), "$1");
      res = locales.regexp[child];
      if (res) {
          for (var i = 0, len = res.length; i < len; i++) {
              str = key.replace(new RegExp(res[i][0]), res[i][1]);
              if (str !== key) {
                  el[k] = str
              }
          }
      }
    }
    translateElementAriaLabel(el)
  }

  function translateElementAriaLabel(el) {
    if (el.ariaLabel) {
      const k = 'ariaLabel'
      const txtSrc = el[k].trim();
      const key = txtSrc.toLowerCase()
        .replace(/\xa0/g, ' ') // replace '&nbsp;'
        .replace(/\s{2,}/g, ' ');
      if (locales.dict[key]) {
        el[k] = el[k].replace(txtSrc, locales.dict[key])
      }
    }
  }

  function shouldTranslateEl(el) {
    const blockIds = ["readme", "wiki-content"];
    const blockClass = [
      "CodeMirror",
      "css-truncate", // 过滤文件目录
      "blob-code",
      "topic-tag", // 过滤标签,
      // "text-normal", // 过滤repo name, 复现：https://github.com/search?q=explore
      "repo-list"//过滤搜索结果项目,解决"text-normal"导致的有些文字不翻译的问题,搜索结果以后可以考虑单独翻译
    ];
    const blockTags = ["CODE", "SCRIPT", "LINK", "IMG", "svg", "TABLE", "ARTICLE", "PRE"];
    const blockItemprops = ["name"];

    if (blockTags.includes(el.tagName)) {
      return false;
    }

    if (el.id && blockIds.includes(el.id)) {
      return false;
    }

    if (el.classList) {
      for (let clazz of blockClass) {
        if (el.classList.contains(clazz)) {
          return false;
        }
      }
    }

    if (el.getAttribute) {
      let itemprops = el.getAttribute("itemprop");
      if (itemprops) {
        itemprops = itemprops.split(" ");
        for (let itemprop of itemprops) {
          console.log(itemprop)
          if (blockItemprops.includes(itemprop)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function traverseElement(el) {
    translateElementAriaLabel(el)
    if (!shouldTranslateEl(el)) {
      return
    }

    for (const child of el.childNodes) {
      if (["RELATIVE-TIME", "TIME-AGO"].includes(el.tagName)) {
        translateRelativeTimeEl(el);
        return;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        translateElement(child);
      }
      else if(child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === "INPUT") {
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
  function translateDesc(el) {
    $(el).append("<br/>");
    $(el).append("<a id='translate-me' href='#' style='color:rgb(27, 149, 224);font-size: small'>翻译</a>");
    $("#translate-me").click(function() {
      // get description text
      const desc = $(el)
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
            $(el).append("<span style='font-size: small'>由 <a target='_blank' style='color:rgb(27, 149, 224);' href='https://www.githubs.cn'>GitHub中文社区</a> 翻译👇</span>");
            $(el).append("<br/>");
            $(el).append(text);
          } else {
            alert("翻译失败");
          }
        }
      });
    });
  }

  function translateByCssSelector() {
    if(locales.css) {
      for(var css of locales.css) {
        if($(css.selector).length > 0) {
          if(css.key === '!html') {
            $(css.selector).html(css.replacement);
          } else {
            $(css.selector).attr(css.key, css.replacement);
          }
        }
      }
    }
  }
})();
