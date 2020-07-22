// ==UserScript==
// @name        workflowy
// @namespace   http://palesz.org/
// @include     https://workflowy.com/*
// @version     1.1
// @grant       none
// ==/UserScript==

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function matchAll(str, regex) {
    var res = [];
    var m;
    while (m == regex.exec(str)) {
      res.push(m[1]);
    }
    return res;
}

function traverse(node,func,level) {
  var l = (level ? level : 0);
  func(node,l);
  for (i in node.ch) {
    traverse(node.ch[i],func,l+1);
  }
}

// PROJECT_TREE_DATA.mainProjectTreeInfo.rootProjectChildren[2]

function accNodesUsingPredicate(rootNodes,predicate) {
  var acc = [];
  traverse({nm:"", ch:rootNodes}, function(n,l) {
    if (!predicate || predicate(n,l)) {
      acc.push(n);
    }
  });
  return acc;
}

function generatePredicate(prefixes,completedOnly) {
  return function(n,l) {
    if (completedOnly && n.cp) {
      return false;
    }
    for (i in prefixes) {
      if (n.nm.indexOf(prefixes[i]) > -1) {
        return true;
      }
    }
    return false;
  };
}

function allNodesMatchingAnyPrefix(rootNodes,prefixes,completedOnly) {
  if (prefixes.length < 1) {
    return [];
  }
  return accNodesUsingPredicate(rootNodes, generatePredicate(prefixes,completedOnly));
}

function findNodesAndDates(nodes,prefixes) {
  var res = [];
  var m;
  var d;
  var re;
  var matches;
  for (n in nodes) {
    matches = {};
    dates = [];
    for (p in prefixes) {
      re = new RegExp(escapeRegExp(prefixes[p]) + "([^ \n\r\t]+)");
      m = re.exec(nodes[n].nm);
      if (m) {
        d = m[1];
        dates.push(d);
        matches[prefixes[p]] = d;
      }
    }
    res.push({
      "n": nodes[n],
      "by-prefix": matches,
      "dates": dates
    });
  }
  return res;
}

// allNodesMatchingAnyPrefix(PROJECT_TREE_DATA.mainProjectTreeInfo.rootProjectChildren, ["#todo", "#d"]);

function refresh() {
  var prefixes = $('#wfagenda-date-tags').val().split(/[ \t]+/).filter(function(i) { return i; });
  var completedOnly = $('#wfagenda-completed-only').is(':checked');
  var nodes = allNodesMatchingAnyPrefix(PROJECT_TREE_DATA.mainProjectTreeInfo.rootProjectChildren,prefixes,completedOnly);
  var nodesAndDates = findNodesAndDates(nodes,prefixes);
  
  var i,j,d,n;
  var nodesByDate = {};
  for (i in nodesAndDates) {
    for (j in nodesAndDates[i].dates) {
      d = nodesAndDates[i].dates[j];
      if (!nodesByDate[d]) {
        nodesByDate[d] = [];
      }
      nodesByDate[d].push(nodesAndDates[i]);
    }
  }
  
  var sortedDates = Object.keys(nodesByDate).sort();
  var str = "",tasks = "";
  for (d in sortedDates) {
    window.x = nodesByDate[sortedDates[d]];
    tasks = nodesByDate[sortedDates[d]].map(function(i) {
      return `<li><a href="#/${i.n.id}">${i.n.nm}</a></li>`;
    }).join("");
    str += `<li style="margin-top: 10px;">
              <b>${sortedDates[d]}</b><br/>
              <ul style="list-style-type: circle; list-style-position: inside;">
                ${tasks}
              </ul>
            </li>`;
  }
  $('#wfagenda-agenda-view').html(`<ul>${str}</ul>`);
}

function toggleVisibility() {
  $('#wfagenda-content').toggle();
}

function delayedRefresh() {
    if (window.PROJECT_TREE_DATA) {
        refresh();
    }
    setTimeout(delayedRefresh, 3000);
}

$(document).ready(function(){
  $('body').append(`
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all  ui-draggable" tabindex="-1" role="dialog" aria-labelledby="ui-dialog-title-settingsPopup" id="wfagenda-div" 
role="dialog" style="position:fixed; width:450px; z-index: 100; bottom:20px; right:20px; padding: 0px; border: 1px solid #666; background-color: #fff;">
<a id="wfagenda-toggle-link" href="#" onclick="wfagenda.toggleVisibility(); return false;" style="text-decoration: none">
<div class="title ui-dialog-titlebar ui-widget-header">Agenda</div></a>  
<div id="wfagenda-content" style="margin: 10px; display: none;">
    <div>
      <input id="wfagenda-date-tags" type="text" placeholder="#due (date tag prefix(es))" value="#d-"/>
      <input id="wfagenda-completed-only" type="checkbox" checked>Hide Completed</input>
      <div onClick="wfagenda.refresh(); id="currentTheme" class="fancyButton galleryShowButton">Refresh</div>
    </div>
    <div class="content" id="wfagenda-agenda-view" style="margin-top: 20px; overflow-y: scroll; height: 300px;">
    </div>
  </div>
</div>
`);
  window.wfagenda = {
    "refresh": refresh,
    "toggleVisibility": toggleVisibility,
  };
  
  delayedRefresh();
  
});
