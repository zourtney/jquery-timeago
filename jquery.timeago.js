/*
 * timeago: a jQuery plugin, version: 0.9.3 (2011-01-21)
 * @requires jQuery v1.2.3 or later
 *
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2008-2011, Ryan McGeary (ryanonjavascript -[at]- mcgeary [*dot*] org)
 */
(function($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        week: "a week",
        weeks: "%d weeks",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        numbers: []
      }
    },
    settingsRelativeDay: {
      allowFuture: true,
      strings: {
        suffixAgo: {
          default: "ago",
          day: ""
        },
        suffixFromNow: {
          default: "from now",
          day: ""
        },
        day: function(num, millis, isFuture) {
          if (millis.day == 0) {
            return "today";
          }
          if (isFuture) {
            return "tomorrow";
          }
          return "yesterday";
        }
      }
    },
    inWords: function(distanceMillis) {
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      var isFuture = (distanceMillis.absolute < 0)
      if (this.settings.allowFuture) {
        if (isFuture) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
        distanceMillis.absolute = Math.abs(distanceMillis.absolute);
        distanceMillis.day = Math.abs(distanceMillis.day);
      }

      var seconds = distanceMillis.absolute / 1000;
      var minutes = seconds / 60;
      var hours =  minutes / 60;
      var days = distanceMillis.day / 86400000; // 1000 / 60 / 60 / 24
      var years = days / 365;
      
      function getSurroundingWords(prefixOrSuffix, stringOrFunction) {
        if (! prefixOrSuffix || typeof prefixOrSuffix === "string") {
          return prefixOrSuffix;
        }
        
        for (var i in $l) {
          if ($l[i] == stringOrFunction ) {
            return prefixOrSuffix[(prefixOrSuffix.hasOwnProperty(i)) ? i : "default"];
          }
        }
        return "";
      }
      
      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis, isFuture) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        var words = string.replace(/%d/i, value);
        return $.trim([
          getSurroundingWords(prefix, stringOrFunction),
          words,
          getSurroundingWords(suffix, stringOrFunction)
        ].join(" "));
      }

      return seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 12 && substitute($l.hours, Math.round(hours)) ||
        days < 2 && substitute($l.day, 1) ||
        days < 7 && substitute($l.days, Math.floor(days)) ||
        days < 14 && substitute($l.week, 1) ||
        days < 30 && substitute($l.weeks, Math.floor(days / 7)) ||
        days < 60 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.floor(days / 30)) ||
        years < 2 && substitute($l.year, 1) ||
        substitute($l.years, Math.floor(years));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d\d\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      return new Date(s);
    },
    datetime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      var isTime = $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
      var iso8601 = isTime ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    }
  });

  $.fn.timeago = function(settings) {
    var self = this;
    $t.settings = $.extend(true, {}, $t.settings, settings);
    self.each(refresh);

    var $s = $t.settings;
    if ($s.refreshMillis > 0) {
      setInterval(function() { self.each(refresh); }, $s.refreshMillis);
    }
    return self;
  };

  function refresh() {
    var data = prepareData(this);
    if (!isNaN(data.datetime)) {
      $(this).text(inWords(data.datetime));
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if (text.length > 0) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    var now = new Date();
    
    // Get midnight times (missing time params default to 0)
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Return object with two values:
    //   `absolute`: number of milliseconds between date/times
    //   `day`: number of milliseconds between days
    return {
      absolute: (now.getTime() - date.getTime()),
      day: (today.getTime() - dateDay.getTime())
    };
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}(jQuery));
