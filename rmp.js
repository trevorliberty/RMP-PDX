/**
 *  Entry Point
 *  Waits for DOM to be rendered
 *  When user clicks 'Search', waits for selector to be initialized
 */
$(document).ready(function() {
  $(
    "#search-go, #s2id_txt_subject, #txt_courseNumber, #txt_keywordlike, #txt_keywordexact, button[class^='paging']"
  ).on("keypress click", function test(e) {
    if (e.which === 13 || e.type === "click") {
      timerId = setInterval(function() {
        if ($("#table1 > tbody > tr:nth-child(1)").length) {
          //If there is rendered selector, call startScript function
          //#searchResultsTable > div.bottom.ui-widget-header > div > button.paging-control.first.ltr.enabled
          $(
            "[id^='searchResultsTable']"
            //"#searchResultsTable > div.bottom.ui-widget-header > div > button.paging-control.next.ltr.enabled, #searchResultsTable > div.bottom.ui-widget-header > div > button.paging-control.previous.ltr.enabled, #searchResultsTable > div.bottom.ui-widget-header > div > button.paging-control.first.ltr.enabled, #searchResultsTable > div.bottom.ui-widget-header > div > button.paging-control.first.ltr.enabled"
          ).click(function(e) {
            clearInterval(timerId);
            test(e);
            //alert("WTF");
          });
          clearInterval(timerId);
          startScript();
          $(
            ".paging-control next ltr enabled, .paging-control previous ltr enabled"
          ).click(test(e));
          //return;
          clearInterval(timerId);
        }
      }, 500);
    }
  });
});

/** Grabs all name in instructor fields
 * Puts them into an array and removes the
 * \n character in each block  */
function startScript() {
  //clearInterval(id);
  const arr = $("td:nth-child(11)");
  Array.from(arr).forEach(function(subgroup) {
    var nameStr = subgroup.innerText;
    //if there is more than 1 professor:
    var nameSplit = nameStr.split("\n");
    //if nameSplit[] has newline char at lastindex
    --nameSplit.length;
    //Anonymous function with nameSplit[i]
    Array.from(nameSplit).forEach(function(professor) {
      getTID(professor)
        .then(function(tid) {
          return getRatingLink(tid);
        })
        .then(function(ratingLink) {
          return embedLink(subgroup, ratingLink);
        })
        .catch(e => {
          e;
        });
    });
  });
}
/**
 * Gets the TID for passed in professor string
 * POST request to ratemyprofessor
 * Uses regex to grab the correct professor if exists
 * @param {string} professor
 * @returns {Number: tid}
 */
function getTID(professor) {
  const lastName = professor.substring(0, professor.indexOf(",")).trim();
  const firstName = professor
    .substring(professor.indexOf(",") + 1, professor.lastIndexOf(" "))
    .trim();
  /**Returns the TID of the professor if they exist in rate my professor */
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        method: "POST",
        url: "http://www.ratemyprofessors.com/search.jsp",
        data: `queryBy=teacherName&query=portland+state+university+${lastName}+${firstName}&facetSearch=true`
      },
      function(response) {
        //(response);
        if (response) {
          const regex = new RegExp(lastName + "\\W?,\\W?" + firstName, "ig");
          const doc = document.createElement("html");
          const cleaned = response.slice(
            0,
            response.indexOf(`<div class="mobileAppPromo">`)
          );

          doc.innerHTML = cleaned;
          const anchors = doc.getElementsByTagName("a");
          Array.from(anchors).forEach(function(anchor) {
            if (anchor.innerHTML.match(regex)) {
              tid = anchor.getAttribute("href").match(/[0-9]{1,}/g);
              "TTTIIDDD" + tid;
              resolve(tid ? tid[0] : null);
            }
          });
          //return;
        }
      }
    );
  });
}
/**
 * Returns ratingLink, which houses the rating, URL, and
 * tooltip information(popUp)
 * @param {Number} tid
 * @returns {object}
 */
function getRatingLink(tid) {
  "TID" + tid;
  const url = "http://www.ratemyprofessors.com/ShowRatings.jsp";
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        method: "GET",
        url: `${url}?tid=${tid}` //"http://www.ratemyprofessors.com/ShowRatings.jsp?tid=",
        //data: `tid=${tid}`
      },
      function(response) {
        //(response);
        if (response) {
          const cleaned = response.slice(
            0,
            response.indexOf(`<div class="mobileAppPromo">`)
          );
          element = cleaned.match(
            /div class="RatingValue__Numerator-.*">[0-9.]{3}<\/div>/g
          )[0];
          let domparser = new DOMParser().parseFromString(cleaned, "text/html");
          let x = $(`[class^="RatingValue__Numerator"]`, domparser).text();
          let rating = x ? x : "No Reviews";
          const link = `${url + "?tid=" + tid}`;
          const rateLink = `https://www.ratemyprofessors.com/AddRating.jsp?tid=${tid}`;
          const showLink = `https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${tid}`;

          var block = $('[class^="TeacherInfo"]', cleaned).html();
          const embed = getPopup(block, showLink);
          const ratingLink = {
            rate: rating,
            URL: link,
            popUp: embed,
            rateUrl: rateLink
          };
          resolve(ratingLink);
        }
      }
    );
  });
}
/**
 * Returns an object that contains the information inside of the
 * div for a professor page on RateMyProfessor. Used for tooltip
 * @param {string} block
 * @returns {object}
 */
function getPopup(block, showLink) {
  var str = block.substring(block.indexOf("Overall Quality")).trim();
  var arr = str.split("\n");
  //arr = block;
  (function() {
    arr = arr.map(el => el.trim());
    arr = arr.filter(function(e) {
      return (
        e &&
        e != "See how other students describe this professor." &&
        e != "Choose your tags"
      );
    });
  })();
  var Tags = arr.splice(6);
  Tags = Tags.map(tag => {
    return `<li>${tag}</li>`;
  });
  Tags.length = 4;
  Tags.shift();
  Tags = Tags.join(` `);
  //arr[0] = "<div>" + arr[0];
  //("ARRRR" + arr[0]);
  let domparser = new DOMParser().parseFromString(arr[0], "text/html");
  //console.dir("DOX" + dox);
  //let tester = $('[class^="Buttons"]', dox).html("");
  //let doccer = $(dox).html();
  //console.dir("TESETER" + tester);
  $("a, button, img", domparser)
    .contents()
    .unwrap();
  $(`[class^="NameTitle"]`).css("padding", "5rem!important");
  domparser.body.innerHTML;
  const embed = {
    overall: `<iframe style='padding: 0; margin: 0; overflow-y: hidden; border-radius: 9px; width: 32rem; height: 32rem; border: none' src=${showLink}></iframe>`,
    tags: Tags
  };
  return embed;
}
/**
 * Embeds the popUp and rate for the professor at the passed in
 * DOM_Element
 * @param {DOM_Element} professor
 * @param {Rate_Object} ratingLink
 */
function embedLink(professor, ratingLink) {
  if (ratingLink) {
    //(ratingLink);
    let temp = ratingLink.popUp;
    if (!professor.textContent.includes(ratingLink.rate)) {
      const hex = getHexColor(ratingLink.rate);
      professor.innerHTML = `
      ${professor.innerText}
      <a id="${ratingLink.URL}" class="popUp" href=${ratingLink.URL} target="_blank" style="color: #${hex}" visited="color: #${hex}">(${ratingLink.rate})
                </a>`;
      let stuff = ["tooltipster-noir"];
      const tipContent = getContent(ratingLink, stuff);
      if (ratingLink.rate !== "No Reviews") {
        $(professor).tooltipster({
          interactive: true,
          title: "hello",
          side: "left",
          animation: "grow",
          classes: {
            "ui-tooltip": "highlight"
          },
          theme: stuff,
          contentAsHTML: true,
          content: tipContent
        });
      }
    } else {
      `Already embedded rating for ${professor.innerText}`;
    }
  }
}
/**
 * Gets the tipContent for tooltipster
 * @param {object} ratingLink
 * @param {array} themeArray
 */
function getContent(ratingLink, themeArray) {
  let shadow = "";
  let tempObj = ratingLink.popUp;
  themeArray.push(
    "tooltipster-noir-thing2",
    "tooltipster-noir-arrBody3",
    "tooltipster-noir-arrBorder3"
  );
  shadow = "#c73454";

  var tipContent = `
    <div>
      <h1>
        ${tempObj.overall}
      </h1>
    </div>`;
  return tipContent;
}

function getHexColor(ratingLink) {
  ratingLink = Number(ratingLink);
  if (ratingLink >= 4.0) {
    return "B2CF35";
  } else if (ratingLink >= 3.0) {
    return "F7CC1E";
  } else {
    return "E21744";
  }
}
