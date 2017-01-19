import request from 'superagent';
import config  from './config';
import Promise from 'bluebird';
import chalk   from 'chalk';
import fs      from 'fs';
require('superagent-bluebird-promise');



/**
 * Configures and returns youtrack client.
 *
 * @param {Mozaik} mozaik
 * @returns {Object}
 */
const client = mozaik => {

    mozaik.loadApiConfig(config);

    // TODO motehod that creates request that will be called in cycleTime()


    const apiMethods = {
        cycleTime() {
            // TODO implement logic
        }
    };

    return apiMethods;
};


export default client;
