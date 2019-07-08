/*$(document).ready(function(){
    (async function(x){ 
    while(!($("td:nth-child(11)"))){
        await new Promise(r=>setTimeout(r,500));
    }
    })();
});*/
/*var interval = setInterval(function(){
    if($("#table1")){
        clearInterval(interval);
        startScript();
    }
}, 500);*/
/*$(document).ready(function(){
    $("#search-go").click(function(){
        alert("fuck you");
        var interval=setInterval(function(){
            if($("#table1 > thead > tr > th.sort-disabled.instructor-col.ui-state-default > div.title")){
                clearInterval(interval);
                alert("fuck off");
            }
        }, 500);
    });
});
startScript();*/
$(document).ready(function(){
    $("#search-go").click(function(){
        alert("clicked");
        let timerId = setTimeout(function handle(){
            alert('timed');
            //if(!$("#results-terms > div > h3 > span > span")){
            if($("#table1 > tbody > tr:nth-child(1)").length){
                console.log("Here");
                startScript();
            }
            else{
            //    alert("no");
                timerId = setTimeout(handle,1000);
            }
        }, 1000);
    });
});

//issue with this is that I can't know when the initial page is finished loading....going to have to look into exception handling in js and see where I am getting to 
//$(window).ready(function(){
 //   $('#class-search-center-content').on('load',function(){
function startScript(){
    const arr = $("td:nth-child(11)");
    var nameStr = arr[0].innerText;
    //if there is more than 1 professor:
    var nameSplit = nameStr.split('\n');
    //if nameSplit[] has newline char at lastindex 
    --nameSplit.length;
    //call fn() with nameSplit[i]
    Array.from(nameSplit).forEach(function(professor){
        getTID(professor).then(function(tid){
            return getRatingLink(tid);
        }).then(function(ratingLink){
            embedLink(professor, ratingLink);
        });
    });
}
function getTID(professor){
    const lastName = professor.substring(0, professor.indexOf(",")).trim();
    const firstName = professor.substring(professor.indexOf(",")+1,professor.lastIndexOf(" ")).trim();
    //getShit
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
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            method: "POST",
            url: "http://www.ratemyprofessors.com/ShowRatings.jsp",
            data: `tid=${tid}`
        }, function(response){
            if(response){
				const element = response.match(/<div class="grade" title="">[0-9.]{3}<\/div>/g);
                const rating = element ? element[0].match(/[0-9.]{3}/g) : null;
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
