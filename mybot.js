const args = process.argv.slice(2)
const util = require('util');
const fs = require('fs');
const os = require('os');
const Tail = require('always-tail');
const XMLparser = require('xml2json');
const CSVparser = require('csv-parse/lib/sync');
const Discord = require("discord.js");
const client = new Discord.Client();
const execFileSync = require('child_process').execFileSync;
const execFile = require('child_process').execFile;
const spawn = require('child_process').spawn;
const zlib = require('zlib');
const readline = require('readline');
const {google} = require('googleapis');
const https = require('https'); 
const http = require('http');  
const crypto = require('crypto');

var configFile = "./mybot.json";
var cloudLogs = {}; // will hold the cloud module if defined

if ( typeof(args[0]) != 'undefined' && fileExists(args[0]) ) {
  configFile = args[0];
  console.log("Config file set to " + configFile);
} else {
    // it isn't a config file, what are we being told?
    if (typeof(args[0]) != 'undefined' && args[0] === "config") {
        // We are being asked to configure
        console.log("Config mode");
        if (typeof(args[1] == 'undefined')) {
            makeConfigFile(configFile);
        } else {
            makeConfigFile(args[1]);
        }
        process.exit();
    }
}

if ( !fileExists(configFile) ) {
    console.log("Cannot locate my config file " + configFile);
    console.log("Please pass 'config' parameter on commandline to create one.\nEXITING!");
    process.exit(1);
}
// Can't use require if you want to reload values
// var config = require(configFile);
var config = loadJSON(configFile);
// always start offline so that messages get dumped to the console until / unless we connect
config.offline = 1;
// open the log stream as soon as we can
var newLogStream = openNewLog(config.DuplicateLog);

// Always start with a master config
getMasterConfig(getDesiredActiveConfig(), true); // force a clean version at startup

// XXX Experimental
if ( typeof(config.cloudLogs) != 'undefined' && config.cloudLogs.enabled > 0 ) {
  console.log("Cloud Module configured!")
  console.log(util.inspect(config.cloudLogs));
  cloudLogs = require(config.cloudLogs.source);
  cloudLogs[config.cloudLogs.init](https);
}

var defaultConfig = {
  "token": 'PUT YOUR DISCORD TOKEN HERE',
  "ownerID": 'anyone',
  "ownerHandle": 'everyone',
  "Channel": 'farms',
  "GlobalChannel": "general",
  "Quip": "I don't know",
  "Status": 'Monitoring reporting',
  "Announcement": 'Status: I have arrived!',
  "MEMUInstances": '{USERDIR}/.MemuHyperv/MemuHyperv.xml',
  "MEMUPath": 'C:/Program Files/Microvirt/MEmu/MemuHyperv VMs',
  "MEMUC": 'C:/Program Files/Microvirt/MEmu/memuc.exe',
  "GNBotSettings": '{USERDIR}/Desktop/GNLauncher/settings.json',
  "GNBotProfile": '{USERDIR}/Desktop/GNLauncher/profiles/actions/LssBot/default.json',
  "GNBotDir": '{USERDIR}/Desktop/GNLauncher/',
  "GNBotLogMask": '{GNBotDir}/logs/log_{N}.txt',
  "GNBotLogMain": '{GNBotDir}/logs/log_main.txt',
  "process_main": 0,
  "saveMyLogs": 1,
  "checkforAPK": 0,
  "apkStart": "https://www.gnbots.com/apk",
  "apkPath": "Last%20Shelter%20Survival/game.apk",
  "apkDest": "./downloaded.apk",
  "apkStatsFile": "./apkstats.json",
  "DuplicateLog": '{USERDIR}/Desktop/MyDiscBot/Logs/LssSessions.log',
  "XXXXgatherCSV": '{USERDIR}/Desktop/MyDiscBot/gathers.csv',
  "BackupDir": '{USERDIR}/Desktop/MyDiscBot/Backup/',
  "ConfigsDir": '{USERDIR}/Desktop/MyDiscBot/Configs/',
  "screenshot": 0,
  "screenshotDir": "{USERDIR}/Desktop/MyDiscBot/Screenshots/",
  "nircmd": "{USERDIR}/Desktop/MyDiscBot/nircmd.exe",
  "ffmpeg": "{USERDIR}/Desktop/MyDiscBot/ffmpeg.exe",
  "Announce": 1,
  "debug": 0,
  "disabled": 0,
  "processWatchTimer": 5,
  "processLaunchDelay": 30,
  "offline": 1,
  "GNBotThreads": "3",
  "WatchThreads": 0,
  "announceStatus": 60,
  "postStatusScreenshots": 0,
  "minimumCycleTime": 180,
  "activeProfile": "default",
  "SessionStore": "off",
  "Launcher": "GNLauncher.exe",
  "StartLauncher": "-start",
  "StopLauncher": "-close",
  "processName": "GNLauncher.exe",
  "memuProcessName": "MEmuHeadless.exe",
  "DupeLogMaxBytes": 1048576000,
  "DupeLogMaxBytesTest": 1024,
  "MaxFailures": 4,
  "FailureMinutes": 1,
  "prefix": "!",
  "XXXXlocaltime": "America/Nassau",
  "gametime": "Atlantic/South_Georgia",
  "patternfile": "./patterns.json",
  "reporting": "./reporting.json",
  "messages": "./messages.json",
  "useGoogle": 0,
  "googleSecretsFile": "./credentials.json",
  "googleTokenFile": "./token.json",
  "googleSheetId": "",
  "googleWorksheetName": "Sheet1",
  "googleAppName": "Gathers",
  "googleUpdateInterval": 720,
  "enableReboot": 1,
  "manageActiveBasesTime": 0,
  "XXXXmoveGNBotWindow": [1440, 540, 500, 500],
  "XXXXgameDayMap": {
    "0": {"label": "Day 7", "profile": "shield"},
    "1": {"label": "Day 1", "profile": "gather"},
    "2": {"label": "Day 2", "profile": "build"},
    "3": {"label": "Day 3", "profile": "research"},
    "4": {"label": "Day 4", "profile": "hero"},
    "5": {"label": "Day 5", "profile": "train"},
    "6": {"label": "Day 6", "profile": "shield"}
  },
  "gameDayMap": {
    "active": 0,
    "0": {"label": "Day 7 DD KE", "profile": "default"},
    "1": {"label": "Day 1 Gather", "profile": "default"},
    "2": {"label": "Day 2 Build", "profile": "default"},
    "3": {"label": "Day 3 Research", "profile": "default"},
    "4": {"label": "Day 4 Hero", "profile": "default"},
    "5": {"label": "Day 5 Train", "profile": "default"},
    "6": {"label": "Day 6 KE", "profile": "default"}
  },
  "GNBotRestartInterval": 0,
  "GNBotRestartFullCycle": 0,
  "manageActiveBasesTime": 0,
  "XXXXPausedMaster": "{USERDIR}/Desktop/Configs/paused.json",
  "cloudLogs": {
    "source": "{USERDIR}/Desktop/MyDiscBot/CloudLogModule.js",
    "submit" : "cloudLogSubmit", 
    "init": "cloudLogInit",
    "token": "authtokenhere", 
    "host": "websitehostname",
    "endpoint": "/path/to/submit",
    "port": 443,
    "enabled": 0
  },
  "process": [
      "runtime",
      "modules",
      "errors",
      "dailies",
      "donation",
      "autoshield",
      "upgrades",
      "store",
      "gather"
  ]
} // defaultConfig 

// combine the existing and default configs
config = Object.assign(defaultConfig, config);

var debug = config.debug;
var prefix = config.prefix;
var machineid = getMachineUUID();
var processFailures = 0;
var processRunningFailures = 0;
var threadFailures = 0;
var failures = 0;
var success = 0;
var paused = 0;
var grandTotalProcessed = 0;
var totalProcessed = 0;
var elapsedTime = 0;
var averageCycleTime = 0;
var averageProcessingTime = 0;
var pausedTimerHandle = {};
var maintTimerHandle = {};
var gatherFile = "";
var msg_order = "";
var reconfigure = typeof(config.gatherCSV) == 'undefined' ? 0 : 1;
var LSSConfig = loadJSON("GNBotProfile", config);
var patterns = loadPatterns();
var reporting = loadReporting();
var messages = loadMessages();
var LSSSettings = loadJSON("GNBotSettings", config);
var defaultAPKStats = {
  "size": "0",
  "datestr": "Wed, 01 Apr 2020 00:00:00 GMT"
};
var oldAPK = config.apkDest.replace(".apk",".last.apk");
var apkURL = "";
var apkStats = Object.assign(defaultAPKStats, loadJSON(config.apkStatsFile));

if (reconfigure && !fileExists(config.gatherCSV)) {
  SendIt(9999, status_channel, "Cannot locate gather file (gatherCSV) " + config.gatherCSV + " disabling");
  reconfigure = 0;
}

if (( !fileExists(config.nircmd) && !fileExists(config.ffmpeg))) {
  SendIt(9999, status_channel, "screenshots disabled");
  config.screenshot = 0;
  config.postStatusScreenshots = false;
}

if ( typeof(config.screenshotDir) != 'undefined' ) {
  if ( !dirExists(config.screenshotDir)) {
    SendIt(9999, status_channel, "Invalid screenshot directory (screenshotDir) " + config.screenshotDir + " - screenshots disabled");
    config.screenshot = 0;
    config.postStatusScreenshots = false;
  }
}

if ( config.enableReboot == 0) {
  SendIt(9999, status_channel, "Reboot disabled by config (enablereboot)");
}

if ( config.processLaunchDelay > 300 ) {
  SendIt(9999, status_channel, "processLaunchDelay > 300 seconds not supported. using 300 seconds.")
  config.processLaunchDelay = 300;
}

// make the discord channel available. At some point won't be needed like this
var status_channel = null;
var last_status = "Initializing";
var startTime = new Date();
var oldest_date = new Date(); // nothing can have happened before now

// Used while running to keep track of each active session
// if someone runs more than 11 sessions they should be able to figure out how to fix any errors ;)
var sessions = {
  0: {"name": "System Events", "id": 0, "time": "[00:00]", "state": "Monitoring", "lastlog": "Monitoring System Events", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  1: {"name": "init1", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  2: {"name": "init2", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  3: {"name": "init3", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  4: {"name": "init4", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  5: {"name": "init5", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  6: {"name": "init6", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  7: {"name": "init7", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  8: {"name": "init8", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  9: {"name": "init9", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  10: {"name": "init10", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined},
  11: {"name": "init11", "id": 9999, "time": "timestr", "state": "initializing", "lastlog": "initializing", "closed": 0, "processed": 0, logfile:"", tail: undefined}
};

// prototype of a base entry
var base = {
  "name": "base1",
  "id" : 0,
  "UUID": "uuid",
  "path": "path",
  "last_time": new Date('1995-12-31T23:59:00'),
  "time": new Date('1995-12-31T23:59:00'),
  "avg_time": 0,
  "total_time": 0,
  "runs": 0,
  "status": "something",
  "storedActiveState": false,
  "actions": [],
  "config": {},
  "cfgBlob": [],
  "activity": [],
  "finished": new Date(),
  "timers": {},
  "processed": false,
  "shield": {},
  "shieldAction": {"cfgParams": {}, "cfgBlob": "" }
};

var gameDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

// Holds all the base information
// XXX - TODO - Make this a stored cache so stats persist
var bases = [];

// Maps the name of the base to the instance number in Memu
var nameMap = [];

// maps the entry in bases to memu id
var idMap = [];

var gatherMap = {
};

var googleSecrets = {};
const TOKEN_PATH = config.googleTokenFile;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

if (reconfigure) { 
  gatherFile = config.gatherCSV;
  if ( fileExists(config.googleSecretsFile ) && config.useGoogle > 0 ) {
    googleSecrets = loadJSON("googleSecretsFile", config);
    googleAuthorize(googleSecrets, saveCSV);
    var updateInterval = config.googleUpdateInterval * 60 * 1000 || 12 * 60 * 60 * 1000;
    setInterval(googleAuthorize, updateInterval, googleSecrets, saveCSV);
    SendIt(9999, status_channel, "Checking for gather location updates every " + updateInterval / 1000 / 60 + " minutes");
  } else {
    config.useGoogle = 0;
    SendIt(9999, status_channel, "Cannot locate google secrets file. Disabling google sheets integration.")
  }
} else {
  gatherFile = "";
  config.useGoogle = 0;
  SendIt(9999, status_channel, "Custom gather not configured");
}

// Fetch the saved session data if we are using session state
if ( typeof(config.SessionStore) != 'undefined' && config.SessionStore != "off") {
  if (!fileExists(config.SessionStore)) {
    console.log("No session store found at " + config.SessionStore + " running in intial states.");
  } else {
    var tsessions = loadJSON(config.SessionStore);
    // Only pick up the ones we need for the number of sessions we are using
    for (var i = 0; i <= LSSSettings.Threads; i++) {
      sessions[i] = tsessions[i];  
    }
  }
}

buildBaseArray();

loadBaseConfigs();

debugIt(util.inspect(nameMap, true, 10, true), 4);
debugIt(util.inspect(idMap, true, 10, true), 4);

msg_order = getOrderMessage();

showReporting();

// watch for the bot process
if ( config.processWatchTimer > 0) {
  if ( config.processWatchTimer > 100 ) {
    SendIt(9999, status_channel, "NOTE: process watch timer is now in minutes. Using default of 5 minutes");
    config.processWatchTimer = 5;
  }
  setInterval(watchProcess, config.processWatchTimer * 60 * 1000);
} else {
  console.log("```diff\n - WARNING: Not monitoring the bot process```");
}

// move the bot window and keep it on top
setInterval(moveBotWindow, 5 * 60 * 1000); // every 5 minutes

// check the daily configuration settinng
setInterval(checkDailyConfig, 5 * 60 * 1000); // within 5 minutes of reset

// check for a new APK every hour
if ( config.checkforAPK ) {
  SendIt(9999, status_channel, "Checking for an new APK every hour");
  setInterval(checkAPK, 60* 60 * 1000);
}

if ( config.manageActiveBasesTime > 0 ) {
  if ( !fileExists(config.PausedMaster)) {
    SendIt(9999, status_channel, "Bad active base management config. (PausedMaster) - disabling.")
    config.manageActiveBasesTime = 0;
  } else {
    // we are actively managing the status of bases. 
    // check for new things to do ot if we should stop every 10 minutes
    setInterval(checkBaseActivities, 10 * 60 * 1000);
  }
}

// check the cycle time
if ( config.minimumCycleTime > 0 ) {
  setInterval(checkCycleTime, config.minimumCycleTime * 60 * 1000 / 2);
  if ( config.GNBotRestartInterval <= config.minimumCycleTime ) {
    SendIt(9999, status_channel, "Restart interval less than minimum cycle time. Setting restartinterval to minimumCycleTime + 1.")
    config.GNBotRestartInterval = config.minimumCycleTime + 1;
  }
} else {
  console.log("```diff\n - WARNING: Not monitoring the cycle time. Watch that your instances aren't cycling too fast.```");
}

if ( config.GNBotRestartFullCycle > 0 ) {
  SendIt(9999, status_channel, "```diff\n + Configured restarting GNBot on full cycle```");
  if ( config.GNBotRestartInterval > 0 ) {
    config.GNBotRestartInterval = 0;
    SendIt(9999, status_channel, "Disabled restarting on interval (GNBotRestartInterval) because full cycle configured.");
  }
}

// when we get here we aren't restarting on full cycle and have a restart interval
if ( config.GNBotRestartInterval > 0 ) {
  setInterval(function() {
    SendIt(9999, status_channel, "```diff\n + Restarting GNBot based on config (GNBotRestartInterval)```")
    stopBot();
    setTimeout(startBot, 10 * 1000);
  }, config.GNBotRestartInterval * 60 * 1000);
};

// XXX - Check for updates should happen here

// Make sure the critical files exist. They will be started with a watch
checkLogs();

// Watch them
watchLogs();

console.log("Pondering what it means to be a bot...");

// Time to log in and make it all go
if ( config.token != "" ) {
  client.login(config.token);
}

// Initially I was going to else this but if discord is down for some reason we would not get online
// and we would not start the bot. More desirable to process farms than have discord notifications
// all of the time. 
setTimeout(startup, 5*1000);

function startup() {
 // back up the running config
  copyFile(config.GNBotProfile, config.BackupDir + "default.json." + Date.now());
  copyFile(config.MEMUInstances, config.BackupDir + "MemuHyperv.xml." + Date.now());
  if ( !checkProcess(config.processName) ) {
    // bot isn't running, start it
    SendIt(9999, status_channel, "No bot process detected at startup. Starting.");
    startBot();
  }
  if (typeof(config.announceStatus) != 'undefined' && config.announceStatus) {
    var announcePeriod = Number(config.announceStatus);
    if (announcePeriod < 60 ) { announcePeriod = 60; }
    setInterval(function () { SendIt(9999, status_channel, getStatusMessage())}, announcePeriod * 60 * 1000);
  }
};

console.log("We are off to the races.");

// END MAIN CODE

function process_log(session, data) {
  debugIt(`Got data of : ${data} for session ${session}`, 3);
  var str = new String(data).trim();

  // new log moves sessions into a distinct file for each and drops the session number, adding it back for simplicity
  // EG: "[12:04 PM]  #3: "
  // logs are also in local time. convert them to 24h game time so there is a reference for time based operations
  str = str.replace(/(\[.*\])/, `[${gameTime(new Date())}]  #${session}:`);
  debugIt(`Converted data to : ${str} for session ${session}`, 3);
  last_status = str;

  newLogStream.write(last_status + "\n", function(err){
    if (err) {
        console.log(err);
    }
  });

  // rollover 
  if ( newLogStream.bytesWritten > config.DupeLogMaxBytes ) {
    newLogStream.end();
    newLogStream = openNewLog(config.DuplicateLog);
  }

  // skip main and system generated messages that are inserted into the pipeline unless desired
  if ( config.process_main < 1 ) {  
    if ( session == 0 || session == 9999 ) {
      return;
    }
  }

  var interesting_log = str.match(patterns.fundamentals.mustcontain);

  // We only care about lines that have a time and session number
  if ( interesting_log == null) {
    // Well, exceptions are always the rule, aren't they. 
    // We also care about at least ONE VERY IMPORTANT log that doesn't have a time and session
    if (typeof patterns.fundamentals.exceptions !== 'undefined') {
      Object.keys(patterns.fundamentals.exceptions).forEach((path, index) => {
        if (str.match(patterns[patterns.fundamentals.exceptions[path]]) !== null) {
          // Replace the time and add the special system session 0
          // Should already have a session with the new log formats
          // str = str.replace(/(\[.*\])/, `[${simpleTime(new Date())} GT]  #0:`);
        }
      });
      interesting_log = str.match(patterns.fundamentals.mustcontain);
      if ( interesting_log == null) { return; }
    } else {
      // Turns out we aren't interested in it
      return;
    }
  }

  debugIt(`last status is : ${last_status}`, 3);

//   var timestr = `${now.getFullYear()}/${(now.getMonth() + 1)}/${now.getDate()} ${str.match(patterns.fundamentals.time)[1]}:00`;
//  var time = new Date(timestr);
  var time = new Date();
  var session = str.match(patterns.fundamentals.sessionnum)[1];

  debugIt(`Time is ${time.toString()}`, 3);
  debugIt(`session is ${session}`, 3);
  sessions[session].time = time;
  sessions[session].lastlog = last_status;
  
	debugIt(util.inspect(patterns), 3);

	Object.keys(patterns['logentries']).forEach((module, index) => {
		if (typeof(patterns['logentries'][module] == 'object')) {
			if (!config.process.includes(module)) return;
			
			Object.keys(patterns['logentries'][module]).forEach((action) => {
				regex = new RegExp(patterns['logentries'][module][action]);

				if (content = str.match(regex)) {
					debugIt(content, 2);
					debugIt(`${module}-${action}`, 2);
					debugIt(patterns['logentries'][module][action], 2);
          
					var message = messages['default'];
					
					if ( typeof messages[module] !== 'undefined' && typeof messages[module][action] !== 'undefined' && messages[module][action] ) {
						message = messages[module][action];
					}
					message = messages['pre'] + message + messages['post'];

					if (module == 'runtime' && (action == 'startingbase' || action == 'startedbase')) {
            var baseIndex = nameMap[content[1]];
            sessions[session].id = bases[baseIndex].id;
						switch (action) {
							case 'startingbase': sessions[session].state = "Starting"; break;
							case 'startedbase':
                sessions[session].closed = 0;
                sessions[session].state = "Started";
                sessions[session].name = content[1];
                bases[baseIndex].name = content[1];
								bases[baseIndex].last_time = bases[baseIndex].time;
								bases[baseIndex].time = time;
                bases[baseIndex].activity = [];
								if (bases[baseIndex].last_time < oldest_date) {
									message = message.replace('{last_run}', 'unknown');
								} else {
									message = message.replace('{last_run}', timeDiffHoursMinutes(bases[baseIndex].time, bases[baseIndex].last_time) + ' ago');
								}
								break;
						}
            // save off the session state on account changes
            if (typeof(config.SessionStore) != 'undefined' && config.SessionStore != "off") { // XXX - follow up on this. can be cleaner
              storeJSON(sessions, config.SessionStore);
            }
          }
          if ( module == 'runtime' && action == 'skipaction') {
// the way logs work this will always be behind, still deciding if a video helps
//            takeWindowScreenshot(sessions[session].name, true);
          }
					if (module == 'runtime' && action == 'finishedbase') {
						sessions[session].state = "Closed";
						sessions[session].closed += 1;
            var runtime = 'Unknown Duration';
						if (sessions[session].closed > 1) {
              // We have already reported on this
              return;
            }
						sessions[session].processed += 1;
            var base_id = nameMap[sessions[session].name];
            // If we start in the middle of a run, sessions may not yet be filled out.
            if (base_id != 9999 && typeof(bases[base_id]) != 'undefined') {
              bases[base_id].total_time += (time - bases[base_id].time);
              bases[base_id].runs += 1;
              bases[base_id].processed = true;
              runtime = timeDiffHoursMinutes(time, bases[base_id].time)
              // a case exists where things just go to shit and instances never start or start and fail really fast
              // this will catch those cases and after too many simply reboot the system
              // NOTE: With the addition of account skips this can trigger often, set FailureMinutes to 0 to disable
              if (timeDiffMinutes(time, bases[base_id].time) < config.FailureMinutes) {
                let strFail = messages.misc.startfailure;
                strFail = strFail.replace('{failures}', failures);
                strFail = strFail.replace('{runtime}', runtime);
                SendIt(9999, status_channel, strFail);
                failures++; // track that we had a failure
                success = 0; // every time a failure happens we reset the success counter. 
                if (failures > config.MaxFailures) {
                  strFail = messages.misc.maxfailures;
                  strFail = strFail.replace('{maxfailures}', config.MaxFailures);
                  strFail = strFail.replace('{failures}', failures);
                  SendIt(9999, status_channel, strFail);
                  debugIt("TOO MANY INSTANCE FAILURES, REBOOTING", 2);
                  reboot(90);
                  stopBot();
                }
              } else {
                success++; // If we have successfully started half as many times as max failures we assume all is okay
                if (success > Math.ceil(Number(config.MaxFailures)/2)) {
                  failures = 0;
                }
              }
            }
          }
          message = message.replace('{runtime}', runtime);
					message = message.replace('{full}', str);
					message = message.replace('{sessionnum}', session);
					message = message.replace('{base.name}', sessions[session].name);
					message = message.replace('{base.id}', sessions[session].id);
					message = message.replace('{time}', gameTime(time));
					message = message.replace('{localtime}', localTime(time));
					message = message.replace('{gametime}', gameTime(time));

          var strnum = 0;
					content.forEach(element => {
						message = message.replace('{s'+strnum+'}', element);
						strnum++;
          });
          
          if ((action in reporting[module]) && ((reporting[module][action] !== "OFF") && (reporting[module][action] !== 0))) {
            SendIt(sessions[session], status_channel, message);
          } else {
            debugIt(`Reporting for ${module}->${action} was not enabled.
              ${message}`, 1);
          }

          // XXX Experimental
          if ( typeof(config.cloudLogs) != 'undefined' && config.cloudLogs.enabled > 0 ) {
            let base_id = nameMap[sessions[session].name];
            if ( typeof(base_id) != 'undefined' ) { // if we start mid-run things aren't known until we see a start log
              let base = {
                "name": bases[base_id].name,
                "id": bases[base_id].id,
                "machineid": machineid,
                "last_time": bases[base_id].last_time,
                "uuid": bases[base_id].UUID, 
                "active": bases[base_id].storedActiveState
              };
              try { // don't bail if something in the module goes wrong
                cloudLogs[config.cloudLogs.submit](config.cloudLogs, base.uuid, base, module+":"+action, str, message);
              } catch {};
            }
          }

          // keep track of the activity for this base
          // if we start in the middle of a run these might not yet be known
          if ( typeof(bases[nameMap[sessions[session].name]]) == 'undefined' ) {
            return;
          }
          if ( typeof(bases[nameMap[sessions[session].name]].activity) == 'undefined' ) {
            // this one should never happen in practice
            return;
          }
          bases[nameMap[sessions[session].name]].activity.push(last_status);          
          return;
				}
			});
		}
	});
};

process.on('uncaughtException', function (err) {
  SendIt(9999, status_channel, "FYI: Whoah an uncaughtExecption error. If you don't see me again things went terribly wrong.");
  console.log(err);
})

client.on("error", (error) => {
  // get discord errors and print them before continuing
  SendIt(9999, status_channel, "FYI: Caught a discord error. If you don't see me again things went horribly wrong.");
  console.log(error);
});

client.on("ready", () => {
  debugIt("I am ready!", 1);
  config.offline = 0;
  client.user.setActivity(config.Status);
  status_channel = client.channels.find(channel => channel.name === config.Channel);
  if (config.Announce) { 
    SendIt(9999, status_channel, config.Announcement);
  }
  // See comment earlier. Handled as a timeout up top after login
  //  startup();
});

client.on("message", (message) => {
  var now = new Date();
  // Exit and stop if the prefix is not there or if user is a bot or not in the channel we care about
  if (!message.content.startsWith(prefix) || 
      message.author.bot || 
      (message.channel.name != config.Channel && message.channel.name != config.GlobalChannel)
      ) return;

  const commandArgs = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = commandArgs.shift().toLowerCase();
    
  if (command === "status") {
    SendIt(9999, status_channel, getStatusMessage());
  } else
  if (command === "status:detailed") {
    SendIt(9999, status_channel, getStatusMessage(true));
  } else
  if (command === "status:active") {
    SendIt(9999, status_channel, getBaseActiveStatusMessage());
  } else
  if (command === "status:skips") {
    SendIt(9999, status_channel, getBaseSkipTimesMessage());
  } else
  if (command === "status:shields") {
    SendIt(9999, status_channel, getShieldExpireStatusMessage());
  } else
  if ( command === "status:processed") {
    SendIt(9999, status_channel, getProcessedBases());
  } else
  if(command === "say"){
    let text = args.join(" ");
    message.delete();
    message.channel.send(text);
  }
  if (command === "order") {
    SendIt(9999, status_channel, "Accounts are handled in this order");
     // XXX - prettify this at some point
    SendIt(9999, status_channel, msg_order);
  } else
  if (command === "baseconfig") {
// XXX - eventually make it possible to query the config
//    var cmd = message.content.split(":");
//     SendIt(9999, status_channel, util.inspect(bases[nameMap[cmd[1]]].cfgBlob));
  } else
  if (command === "actions" || command === "activity") {
    var activities = "";
    if (typeof(nameMap[commandArgs[0]]) != 'undefined') { 
      let activities = prettifyActionLog(bases[nameMap[commandArgs[0]]].activity);
      debugIt(util.inspect(bases[nameMap[commandArgs[0]]].activity), 4);
      SendIt(9999, status_channel, "Activity for " + bases[nameMap[commandArgs[0]]].name + ":\n" + activities);
    } else {
      SendIt(9999, status_channel, "Usage: " + command + " <basename> - NOTE: Name must match exactly"); 
    }
} else
if (command === "id") {
  SendIt(9999, status_channel, message.author.id);
} else
if (command === "owner") {
  SendIt(9999, status_channel, "The ID of my owner is " + config.ownerID + "\n" + "They are known as @" + config.ownerHandle);
} else
if (command === "help") {
  SendIt(9999, status_channel, `Common Commands:
!reboot: Reboot the host system if permissions allow. 
  By default will schedule it for 120 minutes from issuance. 
  Pass seconds as a parameter to use a different time. 
  EG: "!reboot 60" to reboot in a minute.

!abort: Abort any pending reboot.

!stop: Cleanly stop and close the bot and all running instances.

!start: Start the bot at the last running instance.

!pause: Cleanly stop and close the bot and all running instances for
  a period of time and then start it again. By default pauses 
  for 15 minutes. Pass minutes as a parameter to use a different time. 
  EG: "!pause 60" to pause for an hour.  

!resume: Immediately resume a paused bot.

!status: Print the current status and some basic stats. 
  Note: Effort is still needed to make this accurate all the time 
  however if there is inaccuracy it is obvious. 

!order: Print the order instances should be processed in. 
  Note: This diverges when running multiple sessions over time 
  so watch out if you run for days without starting. 

!actions: Print the action log captured for a base, requires a base name that must match exactly. 
  EG: "!actions myfarm1"

!threads: Change the number of threads in use by GNBot

!profile: Change the running profile (configuration) of GNBot. 
  EG: !profile KE will use the configuration saved in configs directory named KE.json

!interfaces: Dump information about the network interfaces

!memory: Display memory usage information

!uptime: Display the uptime

!cpu: Dump CPU information

!screenshot: Take a screenshot of the desktop(s) and post them. NOTE: Requires nircmd and enabling.
  An instance name is an optional parameter to screenshot an active instance. EG: !screenshot <instancename>

!videoscreenshot: Take a screenshot of the desktop(s) and post them. NOTE: Requires ffmpeg and enabling.

!video: Take a 30 sec video of the desktop(s) and post them. NOTE: Requires ffmpeg and enabling.

!close: Closes an instance by name as if you clicked the X on the window. EG: Close <name> - NOTE: Requires nircmd.

!killbot: forcefully terminates the GNBot process. Needed when the bot process hangs in the background. 

!download:csv: download a fresh CSV from the google sheet

!install:csv: use the csv and update gather locations.

!download:apk: Not yet implemented, it will download the APK one day.

!install:apk: Not yet implemented, it will install the APK one day.

`);
}

// Begin priv commands
// You are not the owner if your ID doesn't match the configured ID
// if the ID is undefined or anyone or everyone then let anyone do it
if(typeof(config.ownerID) != 'undefined' && ( message.author.id !== config.ownerID && config.ownerID != "anyone" && config.ownerID != "everyone" ) ) return;

  if (command === "owner") {
    SendIt(9999, status_channel, config.Quip);
  } else
  if ( command === "machineid" ) {
    SendIt(9999, status_channel, machineid);
  } else 
  if(command === "kick") {
    let member = message.mentions.members.first();
    let reason = commandArgs.slice(1).join(" ");
    member.kick(reason);
  } else
  if ( command === "download:csv") {
    if ( config.useGoogle > 0 ) {
      // will auth to google and then download the csv
      googleAuthorize(googleSecrets, saveCSV);
      SendIt(9999, status_channel, "Downloaded new CSV from google sheets");
    } else {
      SendIt(9999, status_channel, "Google sheets integration disabled");
    }
  } else
  if (command === "install:csv") {
    SendIt(9999, status_channel, "Just use !stop and !start and the current csv will be used");
  } else
  if (command === "download:apk") {
    SendIt(9999, status_channel, "Not implemented yet");
  } else
  if (command === "install:apk") {
    SendIt(9999, status_channel, "Not implemented yet");
  } else
  if (command === "threads" || command === "sessions") {
    var threads = commandArgs[0];
    if ( Number.isNaN(threads) ) {
      SendIt(9999, status_channel, "Invalid sessions value, must be a number.");
    } else {
      config.GNBotThreads = threads;
      restartBot();
    }
  } else
  if (command === "active" || command === "profile") {
    var profile = commandArgs[0];
    if ( !fileExists(config.ConfigsDir + profile + ".json") ) {
      SendIt(9999, status_channel, "Invalid profile, profile must exist in " + config.ConfigsDir + " keeping " + config.activeProfile + " profile active.");
    } else {
      config.activeProfile = profile;
      // disable daily configs
      if ( typeof(config.gameDayMap) != 'undefined' ) {
        SendIt(9999, status_channel, "Manual profiles in use. Disabled automatic daily profiles " + profile);
        config.gameDayMap.active = 0;
      }
      storeJSON(config, configFile);
      SendIt(9999, status_channel, "Updated active profile to " + profile);
      restartBot();
    }
  } else
  if (command === "maintenance" || command === "maint") {
    var start = commandArgs[0];
    var duration = commandArgs[1];
    if (Number.isNaN(start)) {
      SendIt(9999, status_channel, "Invalid start parameter " + start);
      return;
    }
    if (Number.isNaN(duration)) {
      SendIt(9999, status_channel, "Invalid duration parameter " + duration);
      return;
    }
    SendIt(9999, status_channel, "Scheduling downtime for maintenance in " + start + " minutes for a duration of " + duration + " minutes. \n Issue !maintenance:cancel to cancel.");
    maintTimerHandle = setTimeout(pauseBot, start * 60 * 1000, duration);
  } else
  if (command === "maintenance:cancel" || command === "maint:cancel") {
    clearTimeout(maintTimerHandle);
    SendIt(9999, status_channel, "Canceled maintenance window");
  } else
  if (command === "screenshot") {
    if (config.screenshot) {
      var targetWindow = commandArgs[0];
      SendIt(9999, status_channel, "Taking screenshot");
      if ( typeof(nameMap[targetWindow]) == 'undefined' ) {
        takeScreenshot(true);
      } else {
        takeWindowScreenshot(targetWindow, true);
      }
    } else {
      SendIt(9999, status_channel, "Screenshot not configured");
    }
  } else
  if (command === "videoscreenshot") {
    if (config.screenshot) {
      SendIt(9999, status_channel, "Taking screenshot");
      takeVideoScreenShot(true);
    } else {
      SendIt(9999, status_channel, "Screenshot not configured");
    }
  } else
  if (command === "video") {
    if (config.screenshot) {
      var videoLength = commandArgs[0];
      var targetWindow = commandArgs[1];
      if ( isNaN(videoLength)) { 
        if ( typeof(nameMap[targetWindow]) == 'undefined' ) {
          // presumably they provided a window
          targetWindow = videoLength;
        }
        videoLength = 30;
      }
      if ( typeof(nameMap[targetWindow]) == 'undefined' ) {
        SendIt(9999, status_channel, "Capturing Video. Please be patient. I'll post it when available."); 
        setTimeout(takeVideo, 1000, true, videoLength);
      } else {
        setTimeout(takeVideo, 1000, true, videoLength, targetWindow);
      }
    } else {
      SendIt(9999, status_channel, "Screenshot (and thus video) not configured");
    }
  } else
  if (command === "close") {
    var targetWindow = commandArgs[0];
    if ( typeof(nameMap[targetWindow]) == 'undefined' ) {
      SendIt(9999, status_channel, "No configured instances with the name " + targetWindow);
      return;
    }
    SendIt(9999, status_channel, "Closing window " + targetWindow);
    closeWindow(targetWindow);
  } else
  if (command === "reboot") {
    SendIt(9999, status_channel, "```diff\n + Reboot requested```");
    paused = commandArgs[0];
    if ( Number.isNaN(paused) ) {
      paused = 120;
    } 
    stopBotWait();
    reboot(paused);
  } else
  if (command === "abort") {
    SendIt(9999, status_channel, "Aborting reboot request.");
    abortReboot();
  } else
  if (command === "restart") {
    SendIt(9999, status_channel, "Restart requested");
    restartBot();
  } else
  if (command === "start") {
    var startMsg = "Start requested";
    // we have a base parameter
    if ( typeof(commandArgs[0]) != 'undefined' ) {
      if ( typeof(nameMap[commandArgs[0]]) == 'undefined') { // have a param but it doesn't match a base
        SendIt(9999, status_channel, "Base Name to start with (" + commandArgs[0] + ") must be an identical match");
        return;
      } else {  // we have a parameter and a match
        startMsg = "Start requested at base " + commandArgs[0];
      }
    } 
    SendIt(9999, status_channel, startMsg);
    paused = 0;
    startBot(getDesiredActiveConfig(), commandArgs[0]);
  } else 
  if (command === "stop") {
    SendIt(9999, status_channel, "Stop requested");
    paused = 1;
    stopBot();
  } else 
  if (command === "killbot") {
    SendIt(9999, status_channel, "Kill of " + config.processName + " requested");
//    paused = 1;  // don't want to pause it by default on a kill
    killProcess(config.processName);
  } else 
  if (command === "pause") {
    SendIt(9999, status_channel, "Pause requested");
    paused = commandArgs[0];
    force = commandArgs[1] ? 1 : 0;
    if (Number.isNaN(paused) || Number(paused) < 1 ) {
      paused = 15;
    } 
    pauseBot(paused, force);
  } else 
  if (command === "disable") {
    SendIt(9999, status_channel, "Disable requested. Use !enable to enable again.");
    paused = 1;
    config.disabled = 1;
    storeJSON(config, configFile);
    stopBot();
  } else 
  if (command === "enable") {
    SendIt(9999, status_channel, "Bot enabled! Starting.");
    paused = 0;
    config.disabled = 0;
    startBot();
  } else 
  if (command === "resume") {
    clearTimeout(pausedTimerHandle);
    paused = 0;
    resumeBot();
  } else 
  if (command === "interfaces") {
    SendIt(9999, status_channel, JSON.stringify(os.networkInterfaces(), null, 2));
  } else 
  if (command === "memory") {
    let fmem = os.freemem();
    let tmem = os.totalmem();
    SendIt(9999, status_channel, Math.round((fmem / tmem)*100) + "% of " + tmem + " bytes memory available.");
  } else 
  if (command === "uptime") {
    SendIt(9999, status_channel, "My uptime is " + os.uptime() / 60 + " minutes");
  } else 
  if (command === "cpu") {
    SendIt(9999, status_channel, JSON.stringify(os.cpus(), null, 2));
  } else 
  if (command === "stopwait") {
    SendIt(9999, status_channel, "Stop requested");
    paused = 1;
    stopBotWait();
  } else 
  if (command === "reload:patterns" || command === "reload:all" ) {
    patterns = loadPatterns();
    SendIt(9999, status_channel, "Patterns reloaded at " + localTime(now));
  } else 
  if (command === "reload:messages" || command === "reload:all" ) {
    messages = loadMessages();
    SendIt(9999, status_channel, "Messages reloaded at " + localTime(now));
  } else 
  if (command === "reload:reporting" || command === "reload:all" ) {
    reporting = loadReporting();
    SendIt(9999, status_channel, "Reporting reloaded at " + localTime(now));
  }
});

// make the order message
function getOrderMessage() {
  var msg = "";
  bases.forEach(function(element) {
    msg += `ID: ${element.id} -> Name: ${element.name}` + "\n";
    debugIt(`${element.id}:${element.name}`, 2);
  });
  debugIt(`Order Message assembled as 
  ${msg}`, 1);
  return msg;
}

// show what our reporting config is
function showReporting() {
  if ( !config.debug ) { return;}
  for (let [key, value] of Object.entries(patterns['logentries'])) {
    for (let [k1, v1] of Object.entries(patterns['logentries'][key])) {
      // defined and not off or zero means not disabled
        if ((typeof reporting[key] !== 'undefined' ) && ((reporting[key][k1] !== "OFF") && (reporting[key][k1] !== 0))) {
        debugIt(`Reporting enabled for ${key}->${k1} with ${v1} `, 1);
      } else {
        debugIt(`Reporting not enabled for ${key}->${k1} with ${v1}`, 1);
      }
    }
  }
}


// appears that LSS reads and sorts then builds the config. 
function getMemuInLSSAccoutOrder() {
  // Fetch the Memu instances
  if (!fileExists(config.MEMUInstances)) {
    console.log("Missing MEMU instances file " + config.MEMUInstances);
    process.exit(1);
  }
  var memuInstances = loadMemuXML(config.MEMUInstances);
  var acct_order = [];
  for (let val of memuInstances.MemuHyperv.Global.MachineRegistry.MachineEntry) {
    var memu_id = parseInt(val.uuid.split("-")[4].replace("}", ""), 10);
    var storage_path = val.src;
    var uuid = val.uuid;
    var created_date = val.uuid.split("-")[0].replace("{", "");
    acct_order.push({"id": memu_id, "path": storage_path, "created": created_date, "uuid": uuid});
  }
  acct_order.sort(function(a,b) { return a.id-b.id});
  return acct_order;
}

function buildBaseArray() {
  for (baseNum=0; baseNum<LSSConfig.length; baseNum++) {
    var id = LSSConfig[baseNum].Account.Id;
    var memu_reference = getMemuInLSSAccoutOrder();
    bases.push(Object.create(base));
    bases[baseNum]._id = id;
    bases[baseNum].id = id;
    bases[baseNum].UUID = memu_reference[baseNum].uuid;
    bases[baseNum].path = memu_reference[baseNum].path;
    bases[baseNum].created = memu_reference[baseNum].created;
    bases[baseNum].activity = {};
    // track which entry in the array is for this base by ID
    idMap[id] = baseNum;
    if (!fs.existsSync(bases[baseNum].path)) {
      console.log("Missing MEMU instance config file " + bases[baseNum].path);
      process.exit(1);
    } 
    var memuConf = loadMemuXML(bases[baseNum].path);
    for (let val of memuConf.MemuHyperv.Machine.Hardware.GuestProperties.GuestProperty) {
      // debugIt(util.inspect(val),2);
      switch (val.name) {
        case "name_tag":
          bases[baseNum].name = val.value;
          // track which entry in the array is for this base by name
          nameMap[bases[baseNum].name] = baseNum;
          break;
      }
    }
    debugIt(util.inspect(bases[baseNum], true, 10, true), 4);
  }
}

// load messages and local overrides
function loadMessages() {
  var configFile = config.messages;
  var messages = loadJSON(configFile);
  configFile.replace(".json",".local.json");
  if ( fileExists(configFile)) {
    var localMessages = loadJSON(configFile);
    messages = Object.assign(messages, localMessages);
  }
  return messages;
}

// load up local reporting
function loadReporting() {
  var configFile = config.reporting;
  var messages = loadJSON(configFile);
  configFile = configFile.replace(".json",".local.json");
  if ( fileExists(configFile)) {
    var localMessages = loadJSON(configFile);
    messages = Object.assign(messages, localMessages);
  }
  return messages;
}

// load up patterns
function loadPatterns() {
  var configFile = config.patternfile;
  var messages = loadJSON(configFile);
  configFile.replace(".json",".local.json");
  if ( fileExists(configFile)) {
    var localMessages = loadJSON(configFile);
    messages = Object.assign(messages, localMessages);
  }
  return messages;
}

// fetch the gather locations from the csv
function loadGatherCSV() {
  if ( !reconfigure ) { return; }
  if (fileExists(gatherFile)) {
    gatherMap = CSVparser(fs.readFileSync(gatherFile), {colums: true, skip_empty_lines: true})
    debugIt(util.inspect(gatherMap, true, 10, true), 4);
  } else {
    console.log("cannot find gather file " + gatherFile);
    process.exit(1);
  }
}

// Load up the base configuration 
function loadBaseConfigs() {
  var paused_config = {};
  if ( config.manageActiveBasesTime > 0 ) {
    paused_config = loadJSON("PausedMaster", config);
  }
  for ( let a = 0; a < bases.length; a++ ) { // LSSConfig and bases are both ordered the same and have the same id entry
    debugIt("Sanity check: " + bases[a].name + ":" + bases[a].id + ":" + LSSConfig[a].Account.Id, 1);
    debugIt(util.inspect(LSSConfig[a], true, 7, true), 4);
    debugIt("Handling Account number " + a + " ID of " + bases[a].id, 2);
    bases[a].processed = false; // always set to not processed on new load
    if ( config.manageActiveBasesTime > 0 ) { // not managing active state. set to configured state.
      bases[a].storedActiveState = paused_config[a].Account.Active;
    } else {
      bases[a].storedActiveState = LSSConfig[a].Account.Active;
    }
    if ( typeof(LSSConfig[a].List) != 'undefined' ) { // account isn't configured
      bases[a].actions = LSSConfig[a].List;
      debugIt("Grabbed the actions for account ID " + bases[a].id + ":" + bases[a].name, 1)
      for (i=0; i<bases[a].actions.length; i++) {
        if ( bases[a].storedActiveState == false) { continue; } // we can skip inactive ones
        var action = bases[a].actions[i];
        debugIt("Processing " + action.Script.Name + " for " + bases[a].name, 1);
        if ( action.Script.Name.includes("hield") ) { // catch most variations of shield
          bases[a].shield = Object.assign(bases[a].shield, parseShieldAction(action));
        }
      }
      debugIt(util.inspect(bases[a].actions, true, 10, true), 4);
    } else {
      debugIt("Account ID " + bases[a].id + ":" + bases[a].name + " has no actions", 1);
      bases[a].storedActiveState = false;
    }
    debugIt(util.inspect(bases[a], true, 10, true), 4);
    loadBaseTimers();
  }
}

function isShieldOnToday(baseName = null) {
  if ( typeof(bases[nameMap[baseName]]) == 'undefined' || typeof(bases[nameMap[baseName]].shieldAction.cfgParams) == 'undefined ') { return false; }
  return Boolean(bases[nameMap[baseName]].shieldAction.cfgParams["cfg." + gameDays[gameDay()]]);
}

// parse out the shield config and return an object for it
function parseShieldAction(action = null) {
  if ( action == null || !action.Script.Name.includes("hield") ) { return {}}; // not our action
  var shieldAction = {};
  shieldAction.cfgBlob = action.Script.StoredConfig;
  cfgParams = shieldAction.cfgBlob.split(";");
  shieldAction.cfgParams = [];
  for (cfg in cfgParams) {
    var t = cfgParams[cfg].split("=");
    if ( t[0] != "") {
      shieldAction.cfgParams[t[0]] = t[1];
    }
  }
  return shieldAction;
}

// returns an array of base IDs that will expire with N minutes
function activateBases(minutes = config.manageActiveBasesTime) {
  var baseList = getSkipExpireList(minutes); // will contain the base index for bases that should go active
  var shieldList = getExpiredShields(minutes); // we need to see if a shield will expire and thus should be active
  // ^^^ THis doesn't currently override a skip but worse case it catches it next run
  var msg = "Active bases this run are\n";
  for (i=0; i<bases.length; i++) {
    debugIt(bases[i].name, 1);
    bases[i].processed = false; // none of them have been processed yet
    let active = ( shieldList.includes[i] || baseList.includes(i)) && bases[i].storedActiveState;  // only includes Skip & default active base numbers in the bases array
    // SendIt(9999, status_channel, "Base: " + bases[i].name + " should be Active:" + active);
    LSSConfig[i].Account.Active = active;
    if ( active ) { // only display the ones that are active
      msg += bases[i].name + " : " + (active ? "unpaused" : "paused") + "\n";
//      msg += "(name:" + bases[i].name + " id:" + bases[i].id + " i:" + i + " nameMap:" + nameMap[bases[i].name] + " idMap:" + idMap[bases[i].id] + "\n";
    }
  }
  SendIt(9999, status_channel, "making " + bases[baseList[0]].id + " : " + bases[baseList[0]].name + " the starting base");
  setGNBotLastAccount(bases[baseList[0]].id); // set it to an active instance
  SendIt(9999, status_channel, msg);
  return LSSConfig;
}

function makeGathers() {
  debugIt("Base,gatherNum,x,y,farm,fuel,lumber,iron,monday,tuesday,wednesday,thursday,friday,saturday,sunday,ignoreOthers,skipAfterMarchFail", 1);
  bases.forEach(base => {
    debugIt(base.name, 1);
    var gatherNum = 1;
    base.actions.forEach(action => {
      if ( action.Script.Name == "base/Gather2" ) {
        debugIt("Processing " + action.Script.Name, 1);
        debugIt(util.inspect(action.Script, true, 10, true), 4);
        if ( reconfigure > 0 ) {
          // locate the entry in the map for this base
          let entryIndex = gatherMap.findIndex(entry => {
            if (entry[0] === base.name && entry[1] == gatherNum) { return true; }
            return false; 
          });

          // Only change things if we have a match
          if (entryIndex > 0 ) {
            // setup an object for doing work
            let newConfig = "";
            let baseConfig = {};
            // conveniently, cfgEntries will be in order too
            let cfgEntries = action.Script.StoredConfig.split(";");
            cfgEntries.forEach((entry, index) => {
              let name = "";
              let value = "";
              [name, value] = entry.split("=");
              if (entry != '' && value != '') {
                baseConfig[name] = value;
              }
            });
            // replace values in the config
            gatherMap[entryIndex].forEach((entry, index) => {
              switch (gatherMap[0][index]) {
                case "cfg.x":
                case "cfg.y":
                  baseConfig[gatherMap[0][index]] = "'" + entry + "'";
                  break;
                default:
                  baseConfig[gatherMap[0][index]] = entry;
              }
            });
            // since it is in order, do it.
            cfgEntries.forEach((entry, index) => {
              let name = "";
              let value = "";
              [name, value] = entry.split("=");
              if (entry != '' && value != '') {
                newConfig = newConfig + name + "=" + baseConfig[name] + ";";
              }
            });
            action.Script.StoredConfig = newConfig;
          }
        }
        debugIt(base.name + "," + gatherNum + "," + action.Script.StoredConfig, 1);
        gatherNum++;
      }
    });
  });

  // Set the base configuration 
  var acctnum = 0;
  LSSConfig.forEach(account => {
    debugIt(util.inspect(account, true, 7, true), 4);
    var thisID = account.Account.Id;
    debugIt("Handling Account number " + acctnum + " at position " + idMap[thisID], 2);
    if ( typeof(account.List) != 'undefined') {
      account.List = bases[idMap[thisID]].actions;
      debugIt("Replaced the actions for account ID " + thisID + ":" + bases[idMap[thisID]].name, 1)
      debugIt(util.inspect(account.List, true, 10, true), 4);
    } else {
      debugIt("Account ID " + thisID + ":" + bases[idMap[thisID]].name + " has no actions", 1);
    }
    acctnum++;
  });

  return LSSConfig;

}

function takeVideoScreenShot(post = false) {
  if ( config.disabled ) { return; }
  // ffmpeg.exe -f gdigrab -framerate 1 -i desktop -vframes 1 output.jpeg
  if ( !config.screenshot ) {return;} // If they aren't allowed don't do them
  var screenshotName = config.screenshotDir + "screenshot" + Date.now() + ".jpg";
  execFileSync(config.ffmpeg, ["-f", "gdigrab", "-framerate", "1", "-i", "desktop", "-vframes", "1", screenshotName], {"timeout":5000});
  if ( post ) {
    SendFileAttachment(9999, status_channel, "The current desktop ", screenshotName);
  }
}

function takeVideo(post = false, length = 30, targetWindow = "desktop") {
  if ( config.disabled ) { return; }
  // XXX - TODO: make the command string configurable
  if ( length > 180 ) {
    SendIt(9999, status_channel, "video longer than 3 minutes not supported")
    length = 180;
  }
  if ( targetWindow != "desktop" ) {
    targetWindow = "title=(" + targetWindow + ")";
    // XXX
    SendIt(9999, status_channel, "window video is currently broken, let me know if you need it");
    targetWindow = "desktop";
  }

  // ffmpeg.exe -y -rtbufsize 150M -f gdigrab -framerate 30 -draw_mouse 1 -i desktop -c:v libx264 -r 30 -preset ultrafast -tune zerolatency -crf 28 -pix_fmt yuv420p -movflags +faststart "output.mp4"
  if ( !config.screenshot ) {return;} // If they aren't allowed don't do them
  var screenshotName = config.screenshotDir + "screenVideo" + Date.now() + ".mp4";
//   execFileSync(config.ffmpeg, ["-y", "-rtbufsize", "150M", "-f", "gdigrab", "-framerate", "30", "-draw_mouse", "1", "-i", targetWindow, "-c:v", "libx264", "-r", "30", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-vframes", length * 30, screenshotName], {"timeout":(length + (length/10)) * 1000});
  execFileSync(config.ffmpeg, ["-y", "-rtbufsize", "150M", "-f", "gdigrab", "-framerate", "30", "-draw_mouse", "1", "-i", targetWindow, "-c:v", "libx264", "-r", "30", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "28", "-movflags", "+faststart", "-vframes", length * 30, screenshotName], {"timeout":(length + (length/10)) * 1000});
  if ( post ) {
    SendFileAttachment(9999, status_channel, "The current desktop video ", screenshotName);
  }
}

function takeScreenshot(post = config.postStatusScreenshots) {
  if ( config.disabled ) { return; }
  if ( !config.screenshot ) {return;} // If they aren't allowed don't do them
  // XXX - TODO: make the command string configurable
  var screenshotName = config.screenshotDir + "screenshot" + Date.now() + ".jpg";
  execFileSync(config.nircmd, ["savescreenshotfull",screenshotName], {"timeout":5000});
  if ( post ) {
    SendFileAttachment(9999, status_channel, "The current desktop ", screenshotName);
  }
}

function takeWindowScreenshot(WindowTitle = "Lss", post = config.postStatusScreenshots) {
  if ( config.disabled ) { return; }
  if ( !config.screenshot ) {return;} // If they aren't allowed don't do them
  // XXX - TODO: make the command string configurable
  var screenshotName = config.screenshotDir + "screenshot" + Date.now() + ".jpg";
  activateWindow(WindowTitle);
  execFileSync(config.nircmd, ["savescreenshotwin",screenshotName], {"timeout":5000});
  if ( post ) {
    SendFileAttachment(9999, status_channel, "Screenshot of " + WindowTitle , screenshotName);
  }
}

function moveWindow(windowTitle = "Lss", X=0, Y=0, W=500, H=500) {
  if ( config.disabled ) { return; }
  execFileSync(config.nircmd, ["win","setsize","ititle", windowTitle, X, Y, W, H], {"timeout":5000});
  activateWindow(windowTitle);
}

function activateWindow(windowTitle = "Lss") {
  if ( config.disabled ) { return; }
  execFileSync(config.nircmd, ["win","activate","ititle", windowTitle], {"timeout":5000});
}

function closeWindow(windowName) {
  if ( config.disabled ) { return; }
  execFileSync(config.nircmd, ["win", "close", "ititle", windowName], {"timeout":5000});
}

function updateStats() {
  // Of course this should be passed around and such but...
  // track these globally so we can check in on them any time
  elapsedTime = timeDiffMinutes(new Date(), startTime);
  totalProcessed = getProcessedBaseCount(); // use the tracked processed flag
//  for (var num in sessions) {
//    if (sessions[num].id != 9999) {
//      totalProcessed += sessions[num].processed;      
//    }
//  }
  averageProcessingTime = Math.round(( elapsedTime * config.GNBotThreads ) / totalProcessed);
  averageCycleTime = Math.round((Number(getActiveBaseCount()) / Number(config.GNBotThreads)) * averageProcessingTime);
}

function resetStats() {
  // reset start time
  startTime = new Date();  
  // reset # processed in sessions on start
  for (var num in sessions) {
    if (sessions[num].id != 9999) {
      sessions[num].processed = 0;      
    }
  }
}

function checkCycleTime() {
  updateStats()
  if ( config.minimumCycleTime > 0 && averageCycleTime > 0 && getProcessedBaseCount() > (getActiveBaseCount() + config.GNBotThreads + config.GNBotRestartFullCycle)) {
    if ( !paused && ( averageCycleTime < config.minimumCycleTime) ) { 
      SendIt(9999, status_channel, "```diff\n - **CAUTION**: A full cycle has completed too fast. Pausing to make up the difference.```");
      pauseBot(config.minimumCycleTime - averageCycleTime, 0);
    } else {
      // okay, not up against minimums but still need to see if we are restarting on full cycle
      if  (!paused && config.GNBotRestartFullCycle > 0 && ( getProcessedBaseCount() + config.GNBotRestartFullCycle ) > getActiveBaseCount() ) { 
        SendIt(9999, status_channel, "```diff\n + Restarting GNBot on full cycle completion by config (GNBotRestartFullCycle)```")
        restartBot(); 
      }
    }
  } 
}

function getStatusMessage(detailed = false) {
  var msg = "";
  var shieldTimers = getShieldExpireTimes();
  var now = Date.now();
  var count = getExpiredShields(60);
  updateStats();
  if ( config.disabled > 0 ) { 
    msg = "Management of the bot is currently disabled.\nUse !enable to enable it.";
    return msg;
  } else {
    if ( paused ) {
      msg = "The bot is currently paused for " + timeoutMinutesRemaining(pausedTimerHandle) + " more minutes\n";
    } else {
      msg = "The bot is currently active\n";
    }
  }

  msg += "I have been working for you for " + elapsedTime + " minutes\n";
  msg += "There are " +  countProcess(config.memuProcessName) + ":" + config.GNBotThreads + " active sessions\n";
  if ( count.length > 0 ) {
    msg += "There are **" + count.length + "** shields **expired or expiring within the hour**\n";
  }
  msg += "A total of " + totalProcessed + " instances have been handled in " + elapsedTime + " minutes\n";
  msg += "with an average processing time of " + averageProcessingTime + " minutes\n";
  msg += "There are " + getActiveBaseCount() + "active" + " instances for a cycle time(est) of " + averageCycleTime + " minutes\n";
  if ( detailed ) { 
    msg += "=============================================\n";
    for (var num in sessions) {
      if (sessions[num].id != 9999) {
        msg += `Session #${num} has processed ${sessions[num].processed} bases in ${timeDiffHoursMinutes(new Date, startTime)} and is processing **${sessions[num].name}**` + "\n";
      }
    }
    msg += "=============================================\n";
    msg += getProcessedBases() + " \n";
    msg += "=============================================\n";
    msg += getBaseSkipTimesMessage() + " \n";
    msg += "=============================================\n";
    msg += getShieldExpireStatusMessage() + "\n";
  }
  return msg;
}

function debugIt(msg, level) { 
  if (debug >= level) {
    console.log("DEBUG : " + msg);
    newLogStream.write(msg + "\n", function(err){
      if (err) {
          console.log(err);
      }
    });
  };
}

function fileExists(file) {
  try
  {
    fs.accessSync(file);
  }
  catch (err)
  {
      return false;
  }
  return true;
}

function dirExists(file) {
  return fileExists(file);
}

function prettifyActionLog(activity) {
  if ( typeof(activity) == 'undefined') { return "No actions.";}
  var retMsg = "";
  activity.forEach(action => retMsg += action + "\n")
  if ( retMsg != "" ) { return retMsg; } else { return "No actions."; };
}

function storeJSON(data, path) {
  try {
    // XXX - TODO: Figure out how to get an actual bare number with a decimal point of .0 in there
//    var jsonData = JSON.stringify(data, function(key, value) {
//      if (key == "EmailSlot") { // mimic the actual behavior of GNBot identically where possible
// doesn't work. toFixed doesn't work either. util.format neither. doesn't appear to affect GNBot so moving on.
//        return value.toPrecision(2);
//        return util.format('%d.0', value);
//      }
//      return value;
//    }, null, 2);
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
//    fs.writeFileSync(path, jsonData);
  } catch (err) {
    console.error(err);
  }
}

function loadJSON(path, configObj){
  var filePath = path;
  // if we are given a configObj assume it is a config
  // and that path will define the path to the key in the config
  if (typeof(configObj) != 'undefined' ) {
    filePath = configObj[path];
  } else {
    configObj = ""
  }

  if (!fileExists(filePath)) {
    console.log(configObj + " File not found " + filePath);
    return false;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(err);
    return false;
  }
}

function SendBuffer(session, channel, msg, buff) {
	if (config.offline) {
    console.log("OFFLINE : " + msg);
  } else {
    if (typeof(channel) != 'undefined' && channel != '') {
      const attachment = new Discord.Attachment(buff);
        channel.send(msg, attachment)  
          .then(message => console.log(`Sent message: ${msg} : ${file}`))
          .catch(console.error);
    } else {
      console.log("DISCORD OFFLINE : " + msg);
    }
  }
	return true;
}

function SendFileAttachment(session, channel, msg, file) {
	if (config.offline) {
    console.log("OFFLINE : " + msg);
  } else {
    if (typeof(channel) != 'undefined' && channel != '') {
      const buffer = fs.readFileSync(file);
      const attachment = new Discord.Attachment(buffer, file);
        channel.send(msg, attachment)  
          .then(message => console.log(`Sent message: ${msg} : ${file}`))
          .catch(console.error);
    } else {
      console.log("DISCORD OFFLINE : " + msg);
    }
  }
	return true;
}

function SendIt(session, channel, msg) {
	if (config.offline) {
    console.log("OFFLINE : " + msg);
  } else {
    if (typeof(channel) != 'undefined' && channel != '') {
        channel.send(msg, {"split": true})  
          .then(message => console.log(`Sent message: ${msg}`))
          .catch(console.error);
    } else {
      console.log("DISCORD OFFLINE : " + msg);
    }
  }
  if ( config.saveMyLogs > 0 ) {
    newLogStream.write(msg + "\n", function(err){
      if (err) {
          console.log(err);
      }
    });
  }
	return true;
}

function loadMemuXML(path) {
  try {
    return JSON.parse(XMLparser.toJson(fs.readFileSync(path, 'utf8')));
  } catch (err) {
    console.error(err);
    return false;
  }
}

function getFileList(directory) {
  return fs.readdirSync(directory);
}
     
// read in storage files and populate the base entries with the timers
function loadBaseTimers() {
  var storageDirectory = config.GNBotDir + "storage/";
  var files = getFileList(storageDirectory);
  var storageFile = "";
  var now = Date.now();

  for (x=0; x < bases.length; x++) { 
    storageFile = storageDirectory + x + "_data.json";
    if ( fileExists(storageFile) ) {
      // using bases means we don't need instance but there are cases where we would so not changing the underlying implementation
      [instance, instanceStorage] = loadStorageFile(storageFile);
    } else { // there is no storage. fill in what we need.
      instance = bases[x].id;
      instanceStorage = {};
      instanceStorage.SkipAccountMinutes = 9; // if we see a 9 in minutes suggests we created it
      instanceStorage.SkipAccountTime = (now - (4*60*60*1000)) / 1000; // four hours ago converted to unixtime so it can be converted to epoc below
    }
    if ( !instanceStorage.LSSAutoShield ) { 
      instanceStorage.LSSAutoShield = {      
        index: 'LastShield',
        skips: {
          LastShield: { timestamp: 0, duration: 0, type: 'SkipFixedTime' }
        }
      };
    };

    // inactive accounts can still have storage files, make sure we don't try to get to the inactive accounts
    // as they aren't going to exist. 
    if ( idMap.includes(instance) ) {
      bases[instance].timers = instanceStorage;
      // not currently stored in ms
      bases[instance].timers.SkipAccountTime = bases[instance].timers.SkipAccountTime * 1000;
      debugIt("Instance: " + bases[instance].name, 2);
      debugIt("Skip set at "  + new Date(bases[instance].timers.SkipAccountTime), 2);
      debugIt("Skip set for " + (bases[instance].timers.SkipAccountMinutes) + " minutes", 2);
      debugIt("Skip ends at " + new Date(bases[instance].timers.SkipAccountTime + (bases[instance].timers.SkipAccountMinutes) * 60 * 1000), 2);
    }
  } 
} // loadBaseTimers

// returns index of base entries that should be active
function getSkipExpireList(within = 60) { // one hour
  var nextBases = [];
  loadBaseTimers();  // make sure we are working with the latest skip timers
  for ( i=0; i<bases.length; i++ ) {
    debugIt("Checking expire for instance " + i + " instanceID of " + bases[i].id, 1);
    if ( bases[i].storedActiveState == false ) { continue; } // this is simply off by default 
    var expires = bases[i].timers.SkipAccountTime + (bases[i].timers.SkipAccountMinutes * 60 * 1000);
    var cutoff = Date.now() + ( within * 60 * 1000 )
    if ( expires < cutoff ) {
      nextBases.push(i);
      debugIt("Skip will expire for instance: " + bases[i].name,1);
      debugIt("  Skip ends at " + new Date(bases[i].timers.SkipAccountTime + (bases[i].timers.SkipAccountMinutes) * 60 * 1000), 1);
    }
  }
  return nextBases;
}

function getShieldExpireStatusMessage() {
  var shieldTimers = getShieldExpireTimes();
  var shieldMsg = "Shield Expire times in minutes:\n";
  var now = Date.now();
  for ( i=0; i<shieldTimers.length; i++ ) {
    if ( bases[i].storedActiveState == false ) { continue; } // base isn't active
    if ( shieldTimers[i] < now ) {
      shieldMsg += bases[i].name + " has 0 minutes left\n";
    } else {
      shieldMsg += bases[i].name + " has " + Math.ceil((shieldTimers[i] - now) / 1000 / 60) + " minutes left\n";
    }
  }
  return shieldMsg;
}

// returns an array with the bases that have shields expiring within this time
function getExpiredShields(within = 60) {
  var theList = [];
  var shieldTimes = getShieldExpireTimes();
  var now = Date.now();
  for (s=0; s<shieldTimes.length; s++) {
    if ( ((shieldTimes[s] + (within * 60 * 1000 )) < now) && ( isShieldOnToday(bases[s].name)) ) { 
      theList.push(s);
    }
  }
  return theList;
}

function getShieldExpireTimes() {
  var shieldTimes = [];
  var now = Date.now();
  for ( i=0; i<bases.length; i++ ) {
    if ( bases[i].storedActiveState == false ) { 
      shieldTimes[i] = 8640000000000000; // isn't active so it can never expire
      continue; 
    } // base isn't active
    if ( typeof(bases[i].timers.LSSAutoShield) == 'undefined' ) { // no shield skip timer for this base - by default it is expired
      shieldTimes[i] = now;
      continue; 
    } 
    var timerIndex = bases[i].timers.LSSAutoShield.index;
    var expires = bases[i].timers.LSSAutoShield.skips[timerIndex].timestamp + (bases[i].timers.LSSAutoShield.skips[timerIndex].duration * 60 * 1000);
    shieldTimes[i] = expires;
  }
  return shieldTimes;

}

function checkBaseActivities() {
  var done = true; // false says done can never be done
  updateStats();
//  if ( !paused && totalProcessed == 0 && elapsedTime > 30 ) { // running 30 minutes and not processing a base while not paused
  if ( !paused && countProcess(config.processName) == 0 && elapsedTime > 30 ) { // running 30 minutes and not processing a base while not paused
    SendIt(9999, status_channel, "Something is wrong with processing. Trying again.");
    if ( countProcess(config.processName) > 0 ) {
      SendIt(9999, status_channel, "Killing GNBot");
      killProcess(config.processName);
    }
    execBot(config.processLaunchDelay); // maybe the start account didn't get set right, just start the bot and see what happens
    done = false;
  }
  for ( i=0; i<bases.length; i++ ) {
    if ( bases[i].storedActiveState == false || LSSConfig[i].Account.Active == false ) { 
      // these bases aren't enabled right now
      continue; 
    } 
    // if any of them isn't done it isn't done
    // processed is set when processing is finished in the logs
    done = done && bases[i].processed;
  }
  // nothing left to do, look at doing new things. 
  if ( done ) { 
    SendIt(9999, status_channel, "All active bases processed. Looking for things to do")
    paused = 1;
    stopBotWait();
    var moreBases = getSkipExpireList(1);
    if ( moreBases.length > 0 ) {
      // we have something to do
      // startBot will get it done. 
      SendIt(9999, status_channel, "There are more bases to process. Starting.")
      paused = 0;
      setTimeout(startBot, 30*1000);
    } else {
      SendIt(9999, status_channel, "Nothing to do right now. Idling");  // the default 10 minute check cycle will handle starting again
    }
  }
}

function getBaseActiveStatusMessage() {
  var msg = ""
  loadBaseTimers();
  bases.forEach(base => {
    msg += base.name + ": " + LSSConfig[nameMap[base.name]].Account.Active + "\n";
  });
  return msg;
}

function getBaseSkipTimesMessage() {
  var msg = "";
  loadBaseTimers();
  for ( i=0; i<bases.length; i++ ) {
    expires = new Date(bases[i].timers.SkipAccountTime + (bases[i].timers.SkipAccountMinutes) * 60 * 1000);
    now = Date.now();
    if ( expires > now ) {
      msg += bases[i].name + ": Base skip expires in " + timeDiffHoursMinutes(expires, now) + "\n";
    } else {
      msg += bases[i].name + ": Base has no active skip" + "\n";
    }
  }
  return msg;
}

function getProcessedBases(all = false) {
  var msg = "base : default active : currrent active : processed";
  for ( i=0; i<bases.length; i++ ) {
    if ( all || LSSConfig[i].Account.Active ) { // If we want all include otherwise just the active ones
      msg += bases[i].name + " : " + bases[i].storedActiveState + " : " + LSSConfig[i].Account.Active + " : " + bases[i].processed + "\n";
    }
  }
  return msg;
}

function getProcessedBaseCount() {
  var count = 0;
  for ( i=0; i<bases.length; i++ ) {
    if ( bases[i].processed == true ) {
      count++;
    }
  }
  return count;
}

function getActiveBaseCount() {
  var count = 0;
  for ( i=0; i<bases.length; i++ ) {
    if ( LSSConfig[i].Account.Active == true ) {
      count++;
    }
  }
  return count;
}

function loadStorageFile(file) {
    var instanceMask = new RegExp(/.*\/(\d+)_data\.json/)
    var instance = Number(file.match(instanceMask)[1]);
    if ( Number.isInteger(instance) ) {
        return [instance, loadJSON(file)] ;
    }
};


function timeDiffHoursMinutes(t1, t2) {
  var time_diff = Math.floor(Math.abs(t1 - t2)/1000/60); // millisec, sec => stored in minutes
  var diff_hours = Math.floor(time_diff/60); 
  var diff_minutes = time_diff - (diff_hours * 60);
  return diff_hours + " hours and " + diff_minutes + " minutes";
}

function timeDiffMinutes(t1, t2) {
  return Math.floor(Math.abs(t1 - t2)/1000/60); // millisec, sec => stored in minutes
}

function gameTime (date) {
  return simpleTime(date, config.gametime) + " GT";
}

function localTime (date) {
  return simpleTime(date, config.localtime) + " LT";
}

function gameDay(time = Date.now()) {
  return new Date(gameTimeInMS(time)).getUTCDay();
}

function GameDate (date) {
  return new Date(gameTimeInMS);
}

function gameTimeInMS(date = new Date()) {
var gameOffsetFromUTC = 2*60*60*1000*-1; // 2 hours, 60 minutes per hour, 60 seconds per minute, 1000 milliseconds per second behind UTC
return new Date(Date.now() + gameOffsetFromUTC).getTime();
}

function simpleTime(date, timezone = config.localtime){
  var options = {hour12: false, hour: "numeric", minute: "numeric", timeZone: timezone};
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function checkProcess(process_name, cb){
  if ( config.disabled ) { return; }
  debugIt("looking for " + process_name, 2);
  return execFileSync('c:/windows/system32/tasklist.exe').indexOf(process_name) > 0;
}

function getMachineUUID() {
  // wmic CsProduct Get UUID
  if ( config.disabled ) { return; }
  debugIt("fetching the machine UUID", 2);
  var retVal = execFileSync('c:/windows/system32/wbem/wmic', ["CsProduct","Get","UUID"]);
  return retVal.toString().match(new RegExp(/(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})/, "g"));
}

function killProcess(process_name, cb){
  if ( config.disabled ) { return; }
  debugIt("looking for " + process_name, 2);
  if ( execFileSync('c:/windows/system32/tasklist.exe').indexOf(process_name) > 0 ) {
    debugIt("Found processes. Killing them.");
    SendIt(9999, status_channel, execFileSync('c:/windows/system32/taskkill.exe', ["/F", "/IM", process_name]));
  };
}

function setGNBotLastAccount(accountID) {
  if ( config.disabled ) { return; }
  var regExe = "c:/windows/system32/reg.exe";
  SendIt(9999, status_channel, "setting start instance to " + accountID);
  debugIt("Editing registry key HKEY_CURRENT_USER/Software/GNBots and setting LastAccount to " + accountID, 2);
//  execFileSync(regExe, ["DELETE", 'HKCU\\Software\\GNBots', "/f", "/v", "LastAccount"], {cwd: undefined, env: process.env, stdio: [ 'inherit', 'inherit', 'inherit' ]}); // delete the old value
  // execFileSync(regExe, ["ADD", 'HKCU\\Software\\GNBots', "/f", "/v", "LastAccount", "/t", "REG_DWORD", "/d", accountID],{cwd: undefined, env: process.env, stdio: [ 'inherit', 'inherit', 'inherit' ]});
  execFileSync(regExe, ["ADD", 'HKCU\\Software\\GNBots', "/f", "/v", "LastAccount", "/t", "REG_DWORD", "/d", accountID]);
  debugIt("Set GNBot LastAccount to " + accountID, 1);
}

// XXX - TODO: Test what happens if it isn't there at all
function deleteGNBotLastAccount() {
  if ( config.disabled ) { return; }
  var regExe = "c:/windows/system32/reg.exe";
  debugIt("Deleting registry key HKEY_CURRENT_USER/Software/GNBots", 2);
  execFileSync(regExe, ["DELETE", 'HKCU\\Software\\GNBots', "/f", "/v", "LastAccount"]); // delete the old value
  debugIt("Set GNBot LastAccount to " + accountID, 1);
}

function countProcess(process_name, cb){
  if ( config.disabled ) { return; }
  debugIt("looking for " + process_name, 2);
  var procRegex = new RegExp(process_name, "g");
  var result = execFileSync('c:/windows/system32/tasklist.exe').toString().match(procRegex);
  var number = 0;
  if ( result && typeof(result.length) != "undefined" ) {
    number = result.length;
  }
  debugIt("Tracking " + number + " memu instances", 2);
  return number;
}

function getFilesizeInBytes(filename) {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats["size"];
  return fileSizeInBytes;
}

function renameFile(oldFile, newFile) {
  fs.renameSync(oldFile, newFile);
}

function checkLogs() {
  sessions[0].logfile = config.GNBotLogMain;
  if ( !fileExists(sessions[0].logfile)) {
      // make the file and let things start normally
      // if the bot is running it'll just start writing to it, if it isn't, then it'll get started
      fs.writeFile(sessions[0].logfile, "", function (err) {
        if (err) throw err;
        console.log("Created " + sessions[l].logfile);
      });
  }

  for (l = 1; l <= LSSSettings.Threads; l++) {
    sessions[l].logfile = config.GNBotLogMask.replace('{N}', l);
    if (!fileExists(sessions[l].logfile)) {
      console.log("Missing log file " + sessions[l].logfile);
      // make the file and let things start normally
      // if the bot is running it'll just start writing to it, if it isn't, then it'll get started
      fs.writeFile(sessions[l].logfile, "", function (err) {
        if (err) throw err;
        console.log("Created " + sessions[l].logfile);
      });
    } 
  }  
}

function watchLogs() {
  for (l = 1; l <= LSSSettings.Threads; l++) {
  }
  SendIt(9999, status_channel, "Watching " + LSSSettings.Threads + " sessions");
  // watch the main log as session 0
  sessions[0].tail = new Tail(config.GNBotLogMain);
  sessions[0].tail.on('line', function(data) { process_log(0, data)});
  sessions[0].tail.on('error', function(data) {
    console.log("error:", data);
  });
  // watching more than we need doesn't matter, watching less does.
  for (t = 1; t <= LSSSettings.Threads; t++) {
    let x = t; // don't ref it
    if ( sessions[x].tail == undefined ) {
      sessions[x].tail = new Tail(sessions[x].logfile);
      sessions[x].tail.on('line', function(data) { process_log(x, data)});
      sessions[x].tail.on('error', function(data) {
        console.log("error:", data);
      });
      debugIt("watch set up for " + sessions[x].logfile, 1);
    } else {
      sessions[x].tail.unwatch();
      debugIt("UNWatched " + sessions[x].logfile, 1 );
    }
  }
  for (l = 1; l <= LSSSettings.Threads; l++) {
    sessions[l].tail.watch();
    debugIt("Watching " + sessions[l].logfile, 1 );
  }
  SendIt(9999, status_channel, "Watching " + LSSSettings.Threads + " sessions");
}

function openNewLog(logPath) {
  if (fileExists(logPath)) {
    let newLog = logPath + (Date.now());
    renameFile(logPath, newLog);
    compressFile(newLog);
  }
  return fs.createWriteStream(logPath);
}

function compressFile(targetFile) {
  const gzip = zlib.createGzip();
  const inp = fs.createReadStream(targetFile);
  const out = fs.createWriteStream(targetFile + ".gz");
  
  inp.pipe(gzip)
    .on('error', (err) => {
      console.log(err);
    })
    .pipe(out)
    .on('error', (err) => {
      console.log(err);
    })
    .on('finish', () => {
      out.end();
      console.log("Archived " + targetFile + " as " + targetFile + ".gz");
      fs.unlinkSync(targetFile);
    });
}

function getDesiredActiveConfig() {
  // if configured, make sure we use the right config. 
  if ( typeof(config.gameDayMap) != 'undefined' && config.gameDayMap != null && config.gameDayMap.active > 0) {
    let gameDayOfWeek = gameDay();
    if ( config.activeProfile != config.gameDayMap[gameDayOfWeek].profile) {
      config.activeProfile = config.gameDayMap[gameDayOfWeek].profile;
    }
  }
  // If that config file doesn't exist revert to default
  if ( !fileExists(config.ConfigsDir + config.activeProfile + ".json") ) {
    SendIt(9999, status_channel, "```Cannot find config for " + config.activeProfile + " using default.```");
    config.activeProfile = "default";
    config.gameDayMap[gameDay()].profile = config.activeProfile; // that file doesn't exist, stop trying to find it. 
  }
  return config.activeProfile;
}

function getMasterConfig(targetConfig = getDesiredActiveConfig(), force = false) {
  var myMsg = force ? "Forced using " : "Using ";
  myMsg += targetConfig + " as configuration";
  var fullSourceConfigPath = config.ConfigsDir + targetConfig + ".json";
  if ( !fileExists(fullSourceConfigPath) ) {
    SendIt(9999, status_channel, "```diff\n- WARNING: Cannot find config for " + targetConfig + " using default.```");
    targetConfig = "default";
    fullSourceConfigPath = config.ConfigsDir + targetConfig + ".json";
  }
  if ((getFilesizeInBytes(config.GNBotProfile) != getFilesizeInBytes(fullSourceConfigPath)) || force == true) {
    debugIt(myMsg, 2);
    SendIt(9999, status_channel, myMsg);
    copyFile(fullSourceConfigPath, config.GNBotProfile, 1); // the actual config to use
    LSSConfig = loadJSON(config.GNBotProfile);
  } else {
    SendIt(9999, status_channel, "Config looks okay. Using existing config.");
  }
}

function setConfig(targetConfig = getDesiredActiveConfig(), force = false) {
  // Always reference the master now
  getMasterConfig(targetConfig, force);
  // make sure we have the latest information
  LSSConfig = loadJSON(config.GNBotProfile);
  loadGatherCSV();
  loadBaseConfigs();
  if (reconfigure) {
    SendIt(9999, status_channel, "Updating gather at positions");
    storeJSON(makeGathers(), config.GNBotProfile);
  }
  if ( config.manageActiveBasesTime > 0 ) {
    SendIt(9999, status_channel, "Updating pause state for instances");
    storeJSON(activateBases(), config.GNBotProfile);
  }
}

function setThreads(threads) {
  var activeCount = getActiveBaseCount();
  if (LSSSettings.Threads != threads || threads > activeCount - 1 ) { 
    debugIt(util.inspect(LSSSettings, true, 10, true), 4);
    if ( threads > activeCount - 1 ) {
      threads = activeCount - 1;
      if ( threads < 1 ) { threads = 1; }
      SendIt(9999, status_channel, "Insufficient active instances adjusting sessions to " + threads + "\n");
    } else {
      SendIt(9999, status_channel, "Set sessions to " + threads);
    }
    LSSSettings.Threads = threads;
    storeJSON(LSSSettings, config.GNBotSettings);
    debugIt(util.inspect(LSSSettings, true, 10, true), 4);
    SendIt(9999, status_channel, "Updating log monitoring for " + threads + " sessions");
    checkLogs();
    watchLogs();
  }
}

function pauseBot(minutes = 15, force = 0) {
  var minutesLeft = timeoutMinutesRemaining(pausedTimerHandle);
  if (Number.isNaN(minutes) ) {
    minutes = 15;
  } 
  // make sure we don't have any other starts scheduled before the one we are requesting
  if ( ( minutesLeft < minutes ) || force ) {
    // This is a longer pause so reset things
    clearTimeout(pausedTimerHandle);
  } else {
    // we should be paused already with a longer pause
    SendIt(9999, status_channel, "Already paused for " + minutesLeft + " more minutes.");
    return;
  }
  SendIt(9999, status_channel, "Pausing bot for " + minutes + " minutes.");
  pausedTimerHandle = setTimeout(resumeBot, minutes * 60 * 1000);
  paused = 1;
  stopBot();
}

function restartBot() {
  paused = 1;
  stopBot();
  setTimeout(resumeBot, 30 * 1000); // give time for the bot to actually shut down before trying to restart it
}

function resumeBot() {
  paused = 0;
  startBot();
}

function timeoutMinutesRemaining(timeoutHandle) {
  return Math.ceil(timeoutRemaining(timeoutHandle) / 60);
}

function timeoutRemaining(timeoutHandle) {
  var timeLeft = 0;
  if ( typeof(timeoutHandle) == 'undefined' || 
       typeof(timeoutHandle._idleStart) == 'undefined' || 
       typeof(timeoutHandle._idleTimeout) == 'undefined' ) {
    SendIt(9999, status_channel, "Apparently there is no paused timeout scheduled");
    // there is no timeout
    timeLeft = 0;
  } else {
    timeLeft = Math.ceil((timeoutHandle._idleStart + timeoutHandle._idleTimeout)/1000 - process.uptime());
    if ( Number.isNaN(timeLeft) ) {
      // this should never actually happen at this point. if it does say why.
      var msg = "Hmm. doesn't seem right. \nminutes left calcualted as " + timeLeft;
      msg += "\n" + "idleStart is: " + timeoutHandle._idleStart;
      msg += "\n" + "IdleTImeout is: " + timeoutHandle._idleTimeout;
      msg += "\n" + "calcualted idle time is: " + (timeoutHandle._idleStart + timeoutHandle._idleTimeout)/1000;
      msg += "\n" + "uptime is: " + process.uptime();
      msg += "\n" + "time left calcualtes as: " + (timeoutHandle._idleStart + timeoutHandle._idleTimeout)/1000 - process.uptime();
      msg += " or a ceil of " + Math.ceil((timeoutHandle._idleStart + timeoutHandle._idleTimeout)/1000 - process.uptime());
      SendIt(9999, status_channel, msg);
      timeLeft = Infinity;
    }
  }
  return timeLeft;
}

function startBot(targetConfig = getDesiredActiveConfig(), targetBase = "" ){
  clearTimeout(pausedTimerHandle);
  resetStats();
  if (checkProcess(config.processName)) {
    paused = 0; // if the bot is running we are not paused
    return;
  }
  setThreads(config.GNBotThreads);
  setConfig(targetConfig); // fixes up the config and sets the first active base as the one to start with
  // if we were passed a base to start, start at that base
  if ( typeof(nameMap[targetBase]) != 'undefined' && targetConfig.includes(nameMap[targetBase])) {
    setGNBotLastAccount(bases[nameMap[targetBase]].id); // this overrides what was done in activateBases through setConfig
  } else {
    if ( typeof(nameMap[targetBase]) != 'undefined' ) { // actual base but not active, don't override setConfig
      SendIt(9999, status_channel, "Base " + nameMap[targetBase] + " is not currently active. Using first active base.")
    }
  }
  execBot(config.processLaunchDelay);
}

function execBot(time = 5) {
  if ( config.disabled ) { return; }
  SendIt(9999, status_channel, "Starting bot in " + time + " seconds");
  setTimeout(function() {
    const options = {
      cwd: config.GNBotDir, // work in the bot root
      env: process.env, // use default environemnt
      detached: true,  // detach the process
      stdio: ['ignore', 'ignore', 'ignore'] // we don't need stdio handles
    };
    var bot = spawn(config.GNBotDir + "/" + config.Launcher, [config.StartLauncher], options);
    bot.on('error', (err) => {
      console.error('Failed to start subprocess. Check permissions.');
      SendIt(9999, status_channel, "FAILED TO START BOT. CHECK PERMISSIONS.");
    });
    bot.unref();  
    paused = 0;
  }, time * 1000);
}

function stopBot() {
  if ( config.disabled ) { return; }
  var myCwd = process.cwd();
  process.chdir(config.GNBotDir);
  const child = execFile(config.GNBotDir + config.Launcher, [config.StopLauncher], (error, stdout, stderr) => {
    if (error) {
      throw(error);
    }
  });
  process.chdir(myCwd);
}

function stopBotWait() {
  if ( config.disabled ) { return; }
  var myCwd = process.cwd();
  process.chdir(config.GNBotDir);
  execFileSync(config.GNBotDir + config.Launcher, [config.StopLauncher], {"timeout":5000});
  process.chdir(myCwd);
}

function abortReboot() {
  if ( config.disabled ) { return; }
  const child = execFile('C:/Windows/System32/shutdown.exe', ['/a'], (error, stdout, stderr) => {
    if (error) {
      throw(error);
    }
  });
  SendIt(9999, status_channel, "A REBOOT HAS BEEN ABORTED.");
}

function reboot(seconds = 120) {
  if ( config.enableReboot < 1 ) {
    SendIt(9999, status_channel, "Reboot requested but reboot is disabled. Check enableReboot in config.");
    return;
  }
  paused = 1;
  SendIt(9999, status_channel, "A REBOOT HAS BEEN REQUESTED.");
  if ( checkProcess(config.processName) ) {
    stopBot();
  }
  const child = execFile('C:/Windows/System32/shutdown.exe', ['/r', '/f', '/t', seconds], (error, stdout, stderr) => {
    if (error) {
      throw(error);
    }
  });
  SendIt(9999, status_channel, "```diff\n + REBOOTING IN " + seconds + " SECONDS! Issue !abort to stop the reboot.```");
}

function checkDailyConfig() {
  if ( paused || config.disabled ) {
    return;
  }
  // first thing we do is check to see if we need to change configurations
  // We do this here because this happens frequently enough to know to switch
  if ( typeof(config.gameDayMap) != 'undefined' && config.gameDayMap.active > 0 ) {
    let gameDayOfWeek = gameDay();
    if ( config.activeProfile != getDesiredActiveConfig()) {
      SendIt(9999, status_channel, "Time for a new profile (" + config.gameDayMap[gameDayOfWeek].label + ") " + config.activeProfile );
      restartBot();
    }
  }
}

function moveBotWindow() {
  // always keep the window where we want it
  if (typeof(config.moveGNBotWindow) != 'undefined') {
    let X = config.moveGNBotWindow[0] || 0; // just in case
    let Y = config.moveGNBotWindow[1] || 0;
    let W = config.moveGNBotWindow[2] || 500;
    let H = config.moveGNBotWindow[3] || 500;
    moveWindow("Lss", X, Y, W, H);
  }  
}

function watchProcess () {
  // if we have been disabled by !disable don't start things
  if ( config.disabled > 0 ) { return; }

  // the whole point of being here is that we want to know the bot is running
  if ( checkProcess(config.processName) ) {
    if ( !paused ) {
      // all is well
      processFailures = 0;
      processRunningFailures = 0;
    } else {
      processRunningFailures += 1;
      // If the bot is paused AND we see a bot process, something is off. 
      // it could be someone is working with the bot manually so not good to kill it outright
      // it could be that the bot is slow to shutdown
      // instead call out that the bot process is in fact running while we think it should be closed. 
      if ( processRunningFailures % 2) { // don't be too noisy
        SendIt(9999, status_channel, "```diff\n- WARNING: BOT IS RUNNING WHILE PAUSED!!. REPEATED MESSAGES INDICATES POSSIBLE HUNG PROCESS?!?!```");
        SendIt(9999, status_channel, "```diff\n- You will need to issue !killbot if you are not manually working with the bot.```");
      }
    }
  } else { // a bot process is not runnnig
    if ( !paused ) {    // we aren't paused and the bot isn't running
      processFailures += 1;
      takeScreenshot(config.postStatusScreenshots);
      process_log(9999, "[00:00 AM] CRITICAL: BOT NOT RUNNING!!!!!!! Attempting to start.");
      SendIt(9999, status_channel, "@" + config.ownerHandle + " - ATTENTION");
      SendIt(9999, status_channel, "```diff\n- CRITICAL: BOT NOT RUNNING!!!!!!! Attempting to start.```");
      startBot();
    } else {
      if ((processFailures % 10) == 0) {
        SendIt(9999, status_channel, "```diff\n + STARTING OF BOT PAUSED for " + timeoutMinutesRemaining(pausedTimerHandle) + " more minutes. use !start to start it.```");
      }
    }
    
    // couldn't start the bot too many times, time for a reboot
    if (processFailures > config.MaxFailures) {
      takeScreenshot(config.postStatusScreenshots);
      process_log(9999, "[00:00 AM] CRITICAL: Too many process failures (" + processFailures + " ), rebooting");
      SendIt(9999, status_channel, "```diff\n- Too many process failures (" + processFailures + " ), rebooting```");
      reboot(60);
    }
  }

  // Now watch the number of instances and make sure we aren't in a consistenly mismatched state.
  // With the addition of active base management (pause, unpause) this can be expected to happen
  // and at times the bot will go idle. If we hit zero sessions active just pause the bot.
  if ( !paused && typeof(config.WatchThreads) != 'undefined' && config.WatchThreads > 0) {
      // this can be very transient with 4 instances stopping at once and taking 2 minutes to start each
      // be a bit more patient in counting as a failure
      if (countProcess(config.memuProcessName) > (config.GNBotThreads / 2) ) { // 50% tolerance
        if (threadFailures > 0) { // running at half capacity at least, count as success
          threadFailures--;
        }
    } else {
      threadFailures++;
      if ( (threadFailures > config.MaxFailures) && config.manageActiveBasesTime > 1 ) {
        takeScreenshot(config.postStatusScreenshots);        
        process_log(9999, "[00:00 AM] ***NOTE***: Instances doesn't match sessions. This is normal in active base management.");
        SendIt(9999, status_channel, "```diff\n + ***NOTE***: Instances doesn't match sessions. This is normal in active base management.```");
        if ( countProcess(config.memuProcessName) ) {
          process_log(9999, "[00:00 AM] ***NOTE***: Bot is idled. Pausing for 10 minutes.");
          SendIt(9999, status_channel, "```diff\n + ***NOTE***: Bot is idled. Pausing for 10 minutes. This is normal in active base management.```");
          pauseBot(10);
        }
      } else 
      if ((threadFailures > config.MaxFailures) && config.WatchThreads > 1 ) {
        takeScreenshot(config.postStatusScreenshots);
        process_log(9999, "[00:00 AM] ***WARNING***: Too many session failures (" + threadFailures + " ), rebooting");
        SendIt(9999, status_channel, "```diff\n- Too many session failures (" + threadFailures + " ), rebooting```");
        reboot(60);
      } else 
      if ( threadFailures > config.MaxFailures ) {
        process_log(9999, "[00:00 AM] ***WARNING***: Instances doesn't match sessions (" + threadFailures + " faulires). Monitoring.");
        SendIt(9999, status_channel, "```diff\n - ***WARNING***: Instances doesn't match sessions (" + threadFailures + " faulires). Monitoring.```");
        takeScreenshot(config.postStatusScreenshots);
      }
    } 
  }
}

function copyFile (source, dest, clobber = false) {
  if (fileExists(source)) {
    if (!fileExists(dest) || clobber) {
      fs.copyFileSync(source, dest);
      console.log(source + ' was copied to ' + dest);
      return;
    } 
  }
  console.log('Could not copy file ' + source + ' to ' + dest);
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function googleAuthorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function saveCSV(auth) {
  var csv = "";
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetId,
    range: config.googleWorksheetName,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      // Print columns as a CSV
      rows.map((row) => {
        csv = csv + `${row[0]},${row[1]},${row[2]},${row[3]},${row[4]},${row[5]},${row[6]},${row[7]},${row[8]},${row[9]},${row[10]},${row[11]},${row[12]},${row[13]},${row[14]},${row[15]},${row[16]},${row[17]}\n`;
      });
    } else {
      console.log('No data found.');
    }
    debugIt("CSV File content is:\n" + csv, 1);
    fs.writeFile(config.gatherCSV, csv, (err) => {
      if (err) return console.error(err);
      console.log('csv data saved to', config.gatherCSV);
    });
  });
}

function checkAPK() {
  getRealAPKurl(config.apkStart).then(function(path) {
    apkURL = path + config.apkPath;
    isNewAPKAvailable(apkURL, apkStats).then( function(newStats) {
      var isNewFile = false;
      debugIt("A new APK is available \n" + util.inspect(newStats), 1);
      copyFile(config.apkDest, oldAPK, true);
      saveFilefromURL(apkURL, config.apkDest, function(e) {
        if ( e ) { 
          debugIt(e, 1); 
        } else {  
          isNewFile = getSHA256FileHash(oldAPK) != getSHA256FileHash(config.apkDest);
        }
        if ( isNewFile ) {
          SendIt(9999, status_channel, "@everyone - stopping bot. A new APK is available at " + config.apkDest);
          stopBot();
        }
      }), function(e) { // saveFile
        console.log(e);
      };
    }, function(e) { // isNewAPK
      console.log(e);
    });
  }, function(e) { // getrealurl
    console.log(e)
  });
}

function getRealAPKurl(root) { 
  var http_or_https = http;
  if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(root)) {
      http_or_https = https;
  } 
  return new Promise( function(resolve, reject) {
    http_or_https.get(root, function(response) {
    var headers = JSON.stringify(response.headers);
    switch(response.statusCode) {
      case 200: 
        resolve(root);
      case 301:
      case 302:
      case 303:
      case 307:
        if ( response.headers.location.includes("404")) {
          reject(new Error('Server responded with status code ' + response.statusCode + " to a 404 page\n" + headers));
        } else {
          resolve(response.headers.location);
        }
        break;
      default:
        reject(new Error('Server responded with status code ' + response.statusCode + "\n" + headers));
      }
    })
    .on('error', function(err) {
      reject("Server doesn't report any changes for " + apkURL);
      cb(err);
    });
  });// Promise
}

function isNewAPKAvailable(url, oldStats) { 
  var http_or_https = http;
  if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
      http_or_https = https;
  }
  var myURL = new URL(url);
  var options = {method: 'HEAD', host: myURL.host, port: myURL.port, path: myURL.pathname};
  return new Promise( function(resolve, reject) {
    var req = http_or_https.request(options, function(res) {
      var serverSize = res.headers["content-length"];
      var serverDateStr = res.headers["last-modified"];
      var isNewFileBySize = serverSize != oldStats.size;
      var isNewFileByDate = serverDateStr != oldStats.datestr;
      if ( isNewFileByDate || isNewFileBySize ) {
        oldStats.size = serverSize;
        oldStats.datestr = serverDateStr;
        storeJSON(oldStats, config.apkStatsFile)
        resolve(oldStats);
      } else {
        reject("Server doesn't report any changes for " + url);
      }
    }); // http.request
    req.end();
  });// Promise
}

function saveFilefromURL(url, path, cb) {
    var http_or_https = http;
    if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
        http_or_https = https;
    }
    http_or_https.get(url, function(response) {
        var headers = JSON.stringify(response.headers);
        switch(response.statusCode) {
            case 200:
                var file = fs.createWriteStream(path);
                response.on('data', function(chunk){
                    file.write(chunk);
                    process.stdout.write("Downloaded " + file.bytesWritten + " bytes so far\r");
                }).on('end', function(){
                    file.end();
                    cb(null);
                });
                break;
            case 301:
            case 302:
            case 303:
            case 307:
                saveFilefromURL(response.headers.location, path, cb);
                break;
            default:
                cb(new Error('Server responded with status code ' + response.statusCode + "\n" + headers));
        }
    })
    .on('error', function(err) {
        cb(err);
    });
}

function getSHA256FileHash(filename) {
    if ( fileExists(filename)) {
      const sha256 = crypto.createHash('sha256');
      sha256.update(fs.readFileSync(filename));   
      return sha256.digest('hex');
    } else {
      return 0;
    }
}

function makeConfigFile(configPath = configFile) {

  var userDir = os.homedir().replace(/\\/g, '/');
  var config = defaultConfig;

  // If we have an existing config, lay it over top the template one

  if (fileExists(configPath)) {
  var tconfig = loadJSON(configPath);
      for (let [key, value] of Object.entries(config)) {
        // console.log(key + ":" + value);
        if (typeof(tconfig[key]) != 'undefined') {
            config[key] = tconfig[key];
            // console.log("Updated template with existing " + key + ":" + config[key]);
        } else {
          // convert old values
          switch (key) {
            case 'GNBotLogMask' :
              config[key] = tconfig.LSSLog;
              break;
            case 'GNBotLogMain' :
              config[key] = tconfig.LSSLogMain;
              break; 
            case 'GNBotThreads' :
              config[key] = tconfig.LSSThreads;
              break; 
            case 'GNBotSettings' :
              config[key] = tconfig.LSSSettings;
              break;
            case 'GNBotProfile' :
              config[key] = tconfig.LSSProfile;
              break; 
            case 'GNBotDir' :
              config[key] = tconfig.LauncherDir;
              break;
            case 'gametime' :
              // the correct one
              if ( tconfig.gametime == "Australia/Sydney" ) {
                config[key] = "Atlantic/South_Georgia";
              }
              break;

            case 'processWatchTimer' :
              if ( tconfig.processWatchTimer > 20000 ) {  // now using seconds. Nobody should be checking every 20,000 seconds.
                config[key] = tconfig.processWatchTimer / 1000;
              }
              break;
            default:
              // insert the new ones
              console.log("No existing config found for " + key + ":" + config[key] + " Added. Please verify.");
          }
        }
      }
  }
  
  tconfig = JSON.stringify(config).replace(new RegExp('{USERDIR}', "g"), userDir);
  config = JSON.parse(tconfig);
  tconfig = JSON.stringify(config).replace(new RegExp('{GNBotDir}', "g"), config.GNBotDir);
  config = JSON.parse(tconfig);

  console.log(util.inspect(config, true, 4, true));

  console.log("Configuration file updated. Please check paths and values.");
  storeJSON(config, configPath);
 
}
