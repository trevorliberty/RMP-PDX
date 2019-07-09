/**
 *  Entry Point
 *  Waits for DOM to be rendered 
 *  When user clicks 'Search', waits for selector to be initialized
 */
$(document).ready(function(){
    $("#search-go").click(function(){
        let timerId = setTimeout(function handle(){
            if($("#table1 > tbody > tr:nth-child(1)").length){
                //If there is rendered selector, call startScript function
                startScript();
            }
            else{
                timerId = setTimeout(handle,1000);
            }
        }, 1000);
    });
});

/** Grabs all name in instructor fields
 * Puts them into an array and removes the 
 * \n character in each block  */
function startScript(){
    const arr = $("td:nth-child(11)");
    var nameStr = arr[0].innerText;
    //if there is more than 1 professor:
    var nameSplit = nameStr.split('\n');
    //if nameSplit[] has newline char at lastindex 
    --nameSplit.length;
    //Anonymous function with nameSplit[i]
    Array.from(nameSplit).forEach(function(professor){
        getTID(professor).then(function(tid){
            return getRatingLink(tid);
        }).then(function(ratingLink){
            embedLink(arr[0], ratingLink);
            //embedLink(professor, ratingLink);
        });
    });
}
/** Grabs the TID from RateMyProfessor
 * Splits the first and last name a professor removes middle initial */
function getTID(professor){
    const lastName = professor.substring(0, professor.indexOf(",")).trim();
    const firstName = professor.substring(professor.indexOf(",")+1,professor.lastIndexOf(" ")).trim();
    /**Returns the TID of the professor if they exist in rate my professor */
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            method: "POST",
            url: "http://www.ratemyprofessors.com/search.jsp",
            data: `queryBy=teacherName&query=portland+state+university+${lastName}+${firstName}&facetSearch=true`
        }, function(response){
            if(response){
                const regex = new RegExp(lastName + "\\W?,\\W?" + firstName, "ig");
                const doc = document.createElement("html");
                doc.innerHTML = response;
                const anchors = doc.getElementsByTagName("a");
                Array.from(anchors).forEach(function(anchor){
                    if(anchor.innerHTML.match(regex)){
                        const tid = anchor.getAttribute("href").match(/[0-9]{1,}/g);
                        resolve(tid ? tid[0] : null);
                    }
                });
            }
        });
    });
}
function getRatingLink(tid){
    const url = "http://www.ratemyprofessors.com/ShowRatings.jsp";
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            method: "POST",
            url: `${url}`,//"http://www.ratemyprofessors.com/ShowRatings.jsp",
            data: `tid=${tid}`
        }, function(response){
            if(response){
				const element = response.match(/<div class="grade" title="">[0-9.]{3}<\/div>/g);
                const rating = element ? element[0].match(/[0-9.]{3}/g) : null;
                link = `${url+'?='+tid}`;
				resolve(rating ? rating[0] : null);
            }
        });
    });
}
function embedLink(professor, ratingLink){
    if(ratingLink) {
        const hex = "B2CF35";
		professor.innerHTML = `${professor.innerText} (<span style="color: #${hex}">${ratingLink}</span>)`;
    } else{
        console.log(`Could not get rating for ${professor.innerText}`);
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
