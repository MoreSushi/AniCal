const {default: ical} = require('ical-generator');

function scheduling(nodes) {
    let my_schedule = []
    for (let i in nodes) {
        my_schedule.push(nodes[i]["airingAt"])
    }
    return my_schedule;
}

function episode(nodes) {
    let my_episodes = []
    for (let i in nodes) {
        my_episodes.push(nodes[i]["episode"])
    }
    return my_episodes;
}

function new_description(resume, link) {
    resume = resume.replaceAll("<br>", "\n")
    resume = resume.replace(/(\r\n|\r|\n){2}/g, '$1').replace(/(\r\n|\r|\n){3,}/g, '$1\n')
    //console.log(resume + "\n\n" + link)
    return resume + "\n\n" + link
}

// Here we define our query as a multi-line string
// Storing it in a separate. graphql/.gql file is also possible
const query = `
query ($username: String) {
    MediaListCollection (userName: $username, type: ANIME , status_in: [CURRENT, PLANNING]) {
        lists {
            entries{
                media {
                    id
                    siteUrl
                    description
                    title {
                        romaji
                        native
                        english

                    }
                    seasonYear
                    season
                    airingSchedule {
                        nodes{
                            episode
                            airingAt
                        }
                    }
                }
            }
        }
    }
}
`;

async function export_cal() {
    //Define function in export_cal to avoid unresolved errors
    async function fetchList() {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                console.log("Could not find list of data");
            }

            const data = await response.json();
            // noinspection JSUnresolvedReference
            return await data.data.MediaListCollection.lists;
        } catch (error) {
            console.error(error);
        }
    }

    function new_event(name, timestamp, episode_number, anime_description) {

        let start = new Date(timestamp * 1000)
        let end = new Date((timestamp + 24 * 60) * 1000)

        calendar.createEvent({
            start: start,
            end: end,
            summary: name + " | episode " + episode_number,
            description: anime_description,
        });
    }

//Read info from the application/index.html to define script variables
    let user = document.getElementById("username").value;
    let language = document.getElementById("language").value;
    let season = document.getElementById("season").value;
    let year = parseInt(document.getElementById("year").value);

// Define our query variables and values that will be used in the query request
    let variables = {
        username: user
    };

// Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST', headers: {
            'Content-Type': 'application/json', 'Accept': 'application/json',
        }, body: JSON.stringify({
            query: query, variables: variables
        })
    };

//Script execution:

    const my_list = await fetchList();
    let anime_schedule = {};

    for (let k in my_list) {
        for (let i in my_list[k]["entries"]) {
            if (my_list[k]["entries"][i]["media"]["seasonYear"] === year && my_list[k]["entries"][i]["media"]["season"] === season) {
                let anime = my_list[k]["entries"][i]["media"];
                anime_schedule[String(anime["id"])] = {
                    "title": anime["title"][language],
                    "episodes": episode(anime["airingSchedule"]["nodes"]),
                    "schedule": scheduling(anime["airingSchedule"]["nodes"]),
                    "description": anime["description"],
                    "url": anime["siteUrl"],
                };
            }
        }
    }

    console.log(anime_schedule);

// Generate ics File
    const calendar = ical({name: 'aniCal'});

    for (let key in anime_schedule) {
        let title = anime_schedule[key]["title"]
        let description = new_description(
            anime_schedule[key]["description"], anime_schedule[key]["url"]
        )
        for (let episodes in anime_schedule[key]["episodes"]) {
            new_event(
                title, anime_schedule[key]["schedule"][episodes], episodes, description
            )
        }
    }

    console.log(user, season, year, language)
    console.log(typeof user, typeof season, typeof year, typeof language)
    console.log("Calendar for " + user + " has been generated")

    //console.log(calendar.toString());
    const content = calendar.toString();
    const element = document.createElement("a");
    const file = new Blob([content], {type: "text/plain"});
    element.href = URL.createObjectURL(file);
    element.download = "aniCal.ics";
    element.click();
}

