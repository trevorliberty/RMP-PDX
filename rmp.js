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
      self.timerId = setTimeout(function handle() {
        if ($("#table1 > tbody > tr:nth-child(1)").length) {
          //If there is rendered selector, call startScript function
          startScript();
          $(
            ".paging-control next ltr enabled, .paging-control previous ltr enabled"
          ).click(test(e));
        } else {
          timerId = setTimeout(handle, 100);
        }
      }, 100);
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
          const rateLink = `https://www.ratemyprofessors.com/AddRating.jsp?tid=${tid}`

          var block = $(
            "#mainContent > div.right-panel > div.rating-breakdown",
            response
          ).text();
          const embed = getPopup(block);
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
  var Tags = arr.splice(6);
  Tags = Tags.map(tag => {
    return `<li>${tag}</li>`
  })
  Tags.length = 4
  Tags.shift()
  Tags = Tags.join(` `)
  const embed = {
    overall: arr[0] + ": " + arr[1],
    takeAgain: arr[2] + ": " + arr[3],
    difficulty: arr[4] + ": " + arr[5],
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
    let temp = ratingLink.popUp;
    if (!professor.textContent.includes(ratingLink.rate)) {
      const hex = getHexColor(ratingLink.rate);
      professor.innerHTML = `
      ${professor.innerText}
      (<a id="${ratingLink.URL}" class="popUp" href=${ratingLink.URL} target="_blank" style="color: #${hex}" visited="color: #${hex}">${ratingLink.rate}
                </a>)`;
      let stuff = ['tooltipster-noir'];
      const tipContent = getContent(ratingLink, stuff);
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
        content: tipContent,
      });
    } else {
      console.log(`Already embedded rating for ${professor.innerText}`);
    }
  }
}

/**
 * Gets the tipContent for tooltipster 
 * @param {object} ratingLink 
 * @param {array} themeArray 
 */
function getContent(ratingLink, themeArray) {
  let shadow = '';
  let tempObj = ratingLink.popUp;
  if (ratingLink.rate >= 4) {
    themeArray.push('tooltipster-noir-thing', 'tooltipster-noir-arrBody1', 'tooltipster-noir-arrBorder1');
    shadow = "#afcb34"
  } else if (ratingLink.rate >= 3) {
    themeArray.push('tooltipster-noir-thing1', 'tooltipster-noir-arrBody2', 'tooltipster-noir-arrBorder2');
    shadow = "#dec048"
  } else {
    themeArray.push('tooltipster-noir-thing2', 'tooltipster-noir-arrBody3', 'tooltipster-noir-arrBorder3');
    shadow = "#c73454"
  }
  var tipContent = `
    <div>
      <h1>
        ${tempObj.overall}
      </h1>
      <h2>
        ${tempObj.takeAgain}
      </h2>
      <h3>
        ${tempObj.difficulty}
      </h3>
    </div>`
  if (tempObj.tags.length > 20) {
    tipContent += `
         <h3 style="margin: 0; padding:0">Top tags:</h3>
          <ul style="padding-bottom: 20px; padding-left: 0; margin:0; text-shadow:2px 2px ${shadow}">
          ${tempObj.tags}
          </ul>
          `
  }
  tipContent += `
        <div><a style="color:rgb(253, 253, 253)" target="_blank" href="${ratingLink.URL}#sratingComments">Go to professor's comments</a></div>
        <div><a style="	color: #ffffff" target="_blank" href="${ratingLink.rateUrl}#rateProfessorForm">Rate this professor</a></div>
    `
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