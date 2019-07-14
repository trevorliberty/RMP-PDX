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
        //self.clearTimeout()
      }, 100);
    }
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
            const rating = element ? element[0].match(/[0-9.]{3}/g) : "No reviews";
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

  //var counter = 19573
  function embedLink(professor, ratingLink) {
    var shadow = ""
    if (ratingLink) {
      let temp = ratingLink.popUp;
      if (!professor.textContent.includes(ratingLink.rate)) {
        const hex = getHexColor(ratingLink.rate);
        var tipContent = `
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
         </div>`

        //${professor.innerText}
        var place = "<span></span>"
        var check = professor.innerText;
        if (check.length > 30) {
          place = "<div></div>"
        }
        professor.innerHTML = `${professor.innerText} ${place}
      (<a id="${ratingLink.URL}" class="popUp" href=${ratingLink.URL} target="_blank" style="color: #${hex}" visited="color: #${hex}">${ratingLink.rate}
                </a>)`;
        let stuff = []
        if (ratingLink.rate >= 4) {
          stuff = ['tooltipster-noir', 'tooltipster-noir-thing', 'tooltipster-noir-arrBody1', 'tooltipster-noir-arrBorder1']
          shadow = "#afcb34"
        }
        else if (ratingLink.rate >= 3) {
          stuff = ['tooltipster-noir', 'tooltipster-noir-thing1', 'tooltipster-noir-arrBody2', 'tooltipster-noir-arrBorder2']
          shadow = "#dec048"
        }
        else {
          stuff = ['tooltipster-noir', 'tooltipster-noir-thing2', 'tooltipster-noir-arrBody3', 'tooltipster-noir-arrBorder3']
          shadow = "#c73454"
        }
        if (temp.tags.length > 20) {
          tipContent += `
          <h3 style="margin: 0; padding:0">Top tags:</h3>
          <ul style="padding-bottom: 20px; padding-left: 0; margin:0; text-shadow:3px 3px 3px ${shadow},0px 3px 3px ${shadow};">
          ${temp.tags}
          </ul>
          `
        }


        tipContent += `
        <div><a style="color:rgb(253, 253, 253)" target="_blank" href="${ratingLink.URL}#sratingComments">Go to professor's comments</a></div>
        <div><a id="specialBox" style="	color: #ffffff" target="_blank" href="${ratingLink.rateUrl}#rateProfessorForm">Rate this professor</a></div>
        `
        if (ratingLink.rate !== "No reviews") {
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
          })
        } else {
          console.log(`Could not get rating for ${professor.innerText}`);
        }
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
});