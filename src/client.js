import request from 'superagent-bluebird-promise';
import config  from './config';
import chalk   from 'chalk';
import _ from 'lodash';
import prettyMs from 'pretty-ms';

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

        const loginPath = baseUrl + `/rest/user/login?login=${login}&password=${password}`

        const agent = request.agent();

        mozaik.logger.info(chalk.yellow(`[youtrack] calling ${ loginPath } to attempt login`));

        return agent
            .post(loginPath)
            .then(() => {
                const requestPath = baseUrl + apiPath;
                mozaik.logger.info(chalk.yellow(`[youtrack] calling ${ requestPath }`));
                return agent.get(requestPath)
                    .set('Accept', 'application/json; charset=utf8')
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
    }

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
            const cycleTimeString = prettyMs(cycleTime, {verbose: true});
            return cycleTimeString;
        });
    }

    const getWorkStartedTime = (changes) => {
        let workStartedTime = 0;

        // Object describing start of development
        const progressStarted = {
            name: 'Stage',
            oldValue: [
                'Ready'
            ],
            newValue: [
                'In Progress'
            ]
        };

        _.find(changes, (change) => {
            // check if progress has started
            const hasStarted = _.find(change.field, progressStarted);
            if (hasStarted) {
                // find timestamp when it was updated
                const updated = _.find(change.field, {'name': 'updated'})
                workStartedTime = updated.value;
            }
        });
        return workStartedTime;
    }

    const apiMethods = {
        cycleTime(params) {
            const filter = `Stage: Released resolved date: ${params.sprintStart} .. ${params.sprintEnd}`
            const encodedFilter = encodeURIComponent(filter);
            return buildRequest(`/rest/issue/byproject/${params.projectID}?filter=${encodedFilter}&max=30`)
                .then((res) => {
                    return calculateCycleTime(res.body)
                        .then(res => res);
                })
        }
    };
    return apiMethods;
};

export default client;
