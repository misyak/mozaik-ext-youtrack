import request from 'superagent-bluebird-promise';
import config  from './config';
import chalk   from 'chalk';
import _ from 'lodash';
import moment from 'moment';
require("moment-duration-format");

/**
 * Configures and returns youtrack client.
 *
 * @param {Mozaik} mozaik
 * @returns {Object}
 */
const client = mozaik => {

    mozaik.loadApiConfig(config);

    const buildRequest = (apiPath) => {

        const baseUrl = config.get('youtrack.url');
        const login = config.get('youtrack.login');
        const password = config.get('youtrack.password');

        const loginPath = baseUrl + `/rest/user/login`;

        const agent = request.agent();

        mozaik.logger.info(chalk.yellow(`[youtrack] calling ${ loginPath } to attempt login`));

        return agent
            .post(loginPath)
            .field('login', login)
            .field('password', password)
            .then(() => {
                const requestPath = baseUrl + apiPath;
                mozaik.logger.info(chalk.yellow(`[youtrack] calling ${ requestPath }`));
                return agent.get(requestPath)
                    .accept('application/json; charset=utf8')
                    .promise()
                    .catch(err => {
                        mozaik.logger.error(chalk.red(`[youtrack] ${ err.error }`));
                        throw err;
                    });
            })
            .catch(err => {
                mozaik.logger.error(chalk.red(`[youtrack] ${ err.error }`));
                throw err;
            });
    };

    const buildPostCountsRequest = (queries) => {

        const baseUrl = config.get('youtrack.url');
        const login = config.get('youtrack.login');
        const password = config.get('youtrack.password');

        const loginPath = baseUrl + `/rest/user/login`;

        const agent = request.agent();

        mozaik.logger.info(chalk.yellow(`[youtrack] attempting login on ${ loginPath }`));

        return agent
            .post(loginPath)
            .field('login', login)
            .field('password', password)
            .then(() => {
                const requestPath = baseUrl + '/rest/issue/counts';
                const requestXmlQueries = _.map(queries, q => `<query>${_.escape(q)}</query>\n`).join('');

                const requestXmlBody = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                                        <queries>
                                            ${requestXmlQueries}
                                        </queries>`;
                mozaik.logger.info(chalk.yellow(`[youtrack] calling ${ requestPath }`));

                return agent.post(requestPath)
                    .accept('application/json; charset=utf8')
                    .type('application/xml')
                    .send(requestXmlBody)
                    .promise()
                    .catch(err => {
                        mozaik.logger.error(chalk.red(`[youtrack] buildPostCountsRequest: second request error: ${ err.toString() }`));
                        throw err;
                    });
        })
        .catch(err => {
            mozaik.logger.error(chalk.red(`[youtrack] buildPostCountsRequest: error: ${ err.toString() }`));
            throw err;
        });
    };

    const calculateCycleTime = (issues) => {

        let startTimes = [];
        let resolutionTimes = [];

        _.each(issues, (issue)=> {

            const resolution = _.find(issue.field, {'name': 'resolved'});
            resolutionTimes.push(resolution.value);

            const workStarted = buildRequest(`/rest/issue/${issue.id}/changes`)
                .then((res) => {
                    return getWorkStartedTime(res.body.change);
                });
            startTimes.push(workStarted);
        });

        return Promise.all(startTimes).then(values => {
            let cycleTimes = [];
            _.each(values, (value, key) => {
                if (value) {
                    cycleTimes.push(resolutionTimes[key] - value);
                }
            });

            const cycleTime = _.round(_.sum(cycleTimes) / cycleTimes.length);
            const cycleTimeHours = cycleTime/1000/60/60;
            const cycleTimeString = moment.duration(cycleTimeHours, 'hours').format("d [days] h [hours]");
            return cycleTimeString;
        });
    };

    const getWorkStartedTime = (changes) => {
        let workStartedTime = 0;

        _.each(changes, (change) => {
            // check if progress has started
            const hasStrated = _.find(change.field, (item) => {
                return (_.includes(item.oldValue, 'Ready') && _.includes(item.newValue, 'In Progress'))
            });
            if ( hasStrated ) {
                const updated = _.find(change.field, {'name': 'updated'});
                workStartedTime = updated.value;
                // end each cycle
                return false;
            }
        });
        return workStartedTime;
    };

    const calculateVelocity = (issues) => {
        let storyPoints = [];

        _.each(issues, (issue)=> {
            const hasStoryPoints = _.find(issue.field, {'name': 'Story Points'});
            if (hasStoryPoints) {
                storyPoints.push(parseInt(hasStoryPoints.value[0]));
            }
        });
        const velocity = _.sum(storyPoints);
        return velocity;
    };

    const getIssuesApiUri = (params) => {
        const filter = `Stage: Released resolved date: ${params.sprintStart} .. ${params.sprintEnd}`;
        const encodedFilter = encodeURIComponent(filter);
        return `/rest/issue/byproject/${params.projectID}?filter=${encodedFilter}&max=30`;
    };

    const getAgileApiUri = (params) => {
        const encodedID = encodeURIComponent(params.agileID);
        return `/rest/admin/agile/${encodedID}`;
    };

    const getAgileSprintUri = (params) => {
        const encodedAgileID = encodeURIComponent(params.agileID);
        const encodedSprintID = encodeURIComponent(params.sprintID);
        return `/rest/admin/agile/${encodedAgileID}/sprint/${encodedSprintID}`;
    };

    const getStateCountsAllOnce = (stagesScheme) => {

        let queries = [];
        let stagesData = [];

        let excluded = '';
        if (stagesScheme.exclude !== null)
            excluded = _.map(stagesScheme.exclude, (item) => `-{${item}}`).join(' ');

        _.each(stagesScheme.stages, (stage, index) => {
            queries.push(`Board ${stagesScheme.boardName}: {${stagesScheme.sprintName}} Stage: {${stage.value}} ${excluded}`);
            stagesData.push({
                index: index,
                name: stage.value,
                min: stage.min,
                max: stage.max,
                current: null
            });
        });

        return buildPostCountsRequest(queries)
            .then((response) => {
                const results = response.body;

                if (results.count) {
                    let incompleteResponse = false;

                    _.each(results.count, (count, countIndex) => {
                        if (count === -1) {
                            mozaik.logger.error(chalk.red('[youtrack] getStateCountsAllOnce: problem, there is -1 in response counts at index ' + countIndex));
                            incompleteResponse = true;
                            return false;
                        } else {
                            // order and num of counts should match with order of stages (queries)
                            stagesData[countIndex].current = count;
                        }
                    });

                    if (incompleteResponse) {
                        return Promise.reject(-1);
                    }

                    return stagesData;
                } else {
                    mozaik.logger.error(chalk.red('[youtrack] getStateCountsAllOnce: problem, response did not contain count property'));
                    return Promise.reject('YouTrack response did not contain count property');
                }
            });
    };

    const processAgile = (agile) => {
        try {
            let response = {
                agileID: agile.id,
                boardName: agile.name,
                stages: agile.columnSettings.visibleValues,
                sprintID: _.last(agile.sprints).id,
                exclude: null
            };

            if (agile.swimlaneSettings)
                response.exclude = agile.swimlaneSettings.values;

            return response;
        } catch (err) {
            mozaik.logger.error(chalk.red(`[youtrack] processingAgile: ${ err.toString() }`));
            return Promise.reject({
                status: '[youtrack] processAgile error: probably wrong response'
            });
        }
    };

    const apiMethods = {

        cycleTime(params) {
            return buildRequest(getIssuesApiUri(params))
                .then((res) => {
                    return calculateCycleTime(res.body)
                        .then(res => res);
                })
        },

        velocity(params) {
            return buildRequest(getIssuesApiUri(params))
                .then((res) => {
                    return calculateVelocity(res.body);
                })
        },

        agileBoardState(params) {
            let agileStagesScheme;

            return buildRequest(getAgileApiUri(params))
                .then((agile) => {
                    return processAgile(agile.body);
                })
                .then(processedAgileScheme => {
                    // get sprint name
                    return buildRequest(getAgileSprintUri(processedAgileScheme))
                    .then((sprintResponse) => {
                        processedAgileScheme.sprintName = sprintResponse.body.version;
                        return processedAgileScheme;
                    })
                    .catch((err) => {
                        mozaik.logger.error(chalk.red(`[youtrack] error in getting sprint name. ${err.toString()}`));
                        return Promise.reject({
                            status: `[youtrack] ${err.toString()}`
                        });
                    })
                })
                .then((stagesScheme) => {
                    agileStagesScheme = stagesScheme;
                    return getStateCountsAllOnce(stagesScheme);
                })
                .then((res) => {
                    // response is OK, just pass result to next then()
                    return res;
                }, (rejected) => {
                    if (rejected === -1) {
                        // try API call one more time
                        // youTrack API sent response before calculation finished
                        if (agileStagesScheme) {
                            mozaik.logger.info(chalk.white(`[youtrack] trying to get issue counts one more time...`));
                            return getStateCountsAllOnce(agileStagesScheme);
                        }
                    } else {
                        return Promise.reject(rejected);
                    }
                })
                .then((res) => {
                    return res;
                });
        }
    };
    return apiMethods;
};

export default client;
