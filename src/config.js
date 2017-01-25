import convict from 'convict';

const config = convict({
    youtrack: {
        url: {
            doc: 'YouTrack instance URL.',
            default: '',
            format: String,
            env: 'YOUTRACK_URL'
        },
        login: {
            doc: 'YouTrack user login name that is used to login to instance.',
            default: '',
            format: String,
            env: 'YOUTRACK_USER_LOGIN'
        },
        password: {
            doc: 'YouTrack user password that is used to login to instance',
            default: '',
            format: String,
            env: 'YOUTRACK_USER_PASSWORD'
        }
    }
});

export default config;
