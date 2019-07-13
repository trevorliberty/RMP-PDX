/**
 *  Entry Point
 *  Waits for DOM to be rendered
 *  When user clicks 'Search', waits for selector to be initialized
 */
$(document).ready(function () {
  $(
    "#search-go, #s2id_txt_subject, #txt_courseNumber, #txt_keywordlike, #txt_keywordexact"
  ).on("keypress click", function test(e) {
    if (e.which === 13 || e.type === "click") {
      let timerId = setTimeout(function handle() {
        if ($("#table1 > tbody > tr:nth-child(1)").length) {
          //If there is rendered selector, call startScript function
          startScript();
          $(
            ".paging-control next ltr enabled, .paging-control previous ltr enabled"
          ).click(test(e));
        } else {
          timerId = setTimeout(handle, 500);
        }
      }, 500);
    }
  });
});
/** Grabs all name in instructor fields
 * Puts them into an array and removes the
 * \n character in each block  */


function startScript() {
  const arr = $("td:nth-child(11)");
  Array.from(arr).forEach(function (subgroup) {
    var nameStr = subgroup.innerText;
    //if there is more than 1 professor:
    var nameSplit = nameStr.split("\n");
    //if nameSplit[] has newline char at lastindex
    --nameSplit.length;
    //Anonymous function with nameSplit[i]
    Array.from(nameSplit).forEach(function (professor) {
      getTID(professor)
        .then(function (tid) {
          return getRatingLink(tid);
        })
        .then(function (ratingLink) {
          embedLink(subgroup, ratingLink);
          //embedLink(professor, ratingLink);
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
    chrome.runtime.sendMessage({
      method: "POST",
      url: "http://www.ratemyprofessors.com/search.jsp",
      data: `queryBy=teacherName&query=portland+state+university+${lastName}+${firstName}&facetSearch=true`
    },
      function (response) {
        if (response) {
          const regex = new RegExp(lastName + "\\W?,\\W?" + firstName, "ig");
          const doc = document.createElement("html");
          doc.innerHTML = response;
          const anchors = doc.getElementsByTagName("a");
          Array.from(anchors).forEach(function (anchor) {
            if (anchor.innerHTML.match(regex)) {
              const tid = anchor.getAttribute("href").match(/[0-9]{1,}/g);
              resolve(tid ? tid[0] : null);
            }
          });
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
  const url = "http://www.ratemyprofessors.com/ShowRatings.jsp";
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      method: "POST",
      url: `${url}`, //"http://www.ratemyprofessors.com/ShowRatings.jsp?tid=",
      data: `tid=${tid}`
    },
      function (response) {
        if (response) {
          const element = response.match(
            /<div class="grade" title="">[0-9.]{3}<\/div>/g
          );
          const rating = element ? element[0].match(/[0-9.]{3}/g) : null;
          const link = `${url + "?tid=" + tid}`;
          var block = $(
            "#mainContent > div.right-panel > div.rating-breakdown",
            response
          ).text();
          const embed = getPopup(block);
          const ratingLink = {
            rate: rating,
            URL: link,
            popUp: embed
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
function getPopup(block) {
  var str = block.substring(block.indexOf("Overall Quality")).trim();
  var arr = str.split("\n");
  (function () {
    arr = arr.map(el => el.trim());
    arr = arr.filter(function (e) {
      return (
        e &&
        e != "See how other students describe this professor." &&
        e != "Choose your tags"
      );
    });
  })();
  const Tags = arr.splice(6);

  const embed = {
    overall: arr[0] + ": " + arr[1],
    takeAgain: arr[2] + ": " + arr[3],
    difficulty: arr[4] + ": " + arr[5],
    tags: Tags
  };
  return embed;
}

function embedLink(professor, ratingLink) {

  if (ratingLink) {
    let temp = ratingLink.popUp;
    if (!professor.textContent.includes(ratingLink.rate)) {
      const hex = getHexColor(ratingLink.rate);
      const tipContent = `
        <div>
          <h1>
            ${temp.overall}
          </h1>
          <h2>
            ${temp.takeAgain} 
          </h2>
          <h3>
            ${temp.difficulty}
          </h3>
        </div>

      professor.innerHTML = `
      ${professor.innerText}
      (<a id="${ratingLink.URL}" class="popUp" href=${ratingLink.URL} target="_blank" style="color: #${hex}" visited="color: #${hex}">${ratingLink.rate}
                </a>)`;
       let stuff = []
      if (ratingLink.rate >= 4) {
        stuff = ['tooltipster-noir', 'tooltipster-noir-thing', 'tooltipster-noir-arrBody1', 'tooltipster-noir-arrBorder1']
      }
      else if (ratingLink.rate >= 3) {
        stuff = ['tooltipster-noir', 'tooltipster-noir-thing1', 'tooltipster-noir-arrBody2', 'tooltipster-noir-arrBorder2']
      }
      else {
        stuff = ['tooltipster-noir', 'tooltipster-noir-thing2', 'tooltipster-noir-arrBody3', 'tooltipster-noir-arrBorder3']
      }
      //alert(ratingLink.rate)
      $(professor).tooltipster({
        title: "hello",
        side: "left",
        animation: "grow",
        //$(this).css("background", "red"),
        classes: {
          "ui-tooltip": "highlight"
        },
        theme: stuff,
        contentAsHTML: true,
        content: tipContent
      })

    } else {
      console.log(`Could not get rating for ${professor.innerText}`);
    }
  }
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