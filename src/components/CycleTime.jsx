import React, { Component, PropTypes } from 'react'; // eslint-disable-line no-unused-vars
import reactMixin                       from 'react-mixin';
import { ListenerMixin }                from 'reflux';
import Mozaik                           from 'mozaik/browser';

class CycleTime extends Component {

    constructor(props) {
        super(props);

        this.state = {cycleTime: null};
    }

    getInitialState() {
        return {
            cycleTime: null
        };
    }

    getApiRequest() {

        const { projectID, sprintStart, sprintEnd } = this.props;
        return {
            id: `youtrack.cycleTime.${this.props.projectID}`,
            params: {
                title: this.props.title,
                projectID,
                sprintStart,
                sprintEnd
            }
        };
    }

    onApiData(data) {
        this.setState({
            cycleTime: data
        });
    }

    render() {

        const cycleTime = this.state.cycleTime || 'Calculating ...';
        const {title, sprintStart, sprintEnd} = this.props;

        const datesString = `from:${sprintStart} to:${sprintEnd}`

        return (
            <div>
                <div className="widget__header">
                    <span className="widget__header__subject">
                        {title}
                    </span>
                    <i className="fa fa-clock"/>
                </div>
                <div className="value">
                    <span>{cycleTime}</span>
                </div>
                <div className="dates">
                    <span>{datesString}</span>
                </div>
            </div>
        );
    }
}

CycleTime.displayName = 'CycleTime';

CycleTime.propTypes = {
    projectID: PropTypes.string.isRequired,
    sprintStart: PropTypes.string.isRequired,
    sprintEnd: PropTypes.string.isRequired,
    title: PropTypes.string
};

CycleTime.defaultProps = {
    title: 'YoutTrack Cycle time'
};

reactMixin(CycleTime.prototype, ListenerMixin);
reactMixin(CycleTime.prototype, Mozaik.Mixin.ApiConsumer);

export default CycleTime;
