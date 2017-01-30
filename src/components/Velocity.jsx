import React, { Component, PropTypes } from 'react'; // eslint-disable-line no-unused-vars
import reactMixin                       from 'react-mixin';
import { ListenerMixin }                from 'reflux';
import Mozaik                           from 'mozaik/browser';

class Velocity extends Component {

    constructor(props) {
        super(props);

        this.state = {velocity: null};
    }

    getInitialState() {
        return {
            velocity: null
        };
    }

    getApiRequest() {

        const { projectID, sprintStart, sprintEnd } = this.props;
        return {
            id: `youtrack.velocity.${this.props.projectID}`,
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
            velocity: data
        });
    }

    render() {

        const text = (this.state.velocity) ? `${this.state.velocity} Story points` : 'Calculating ...';
        const {title, sprintStart, sprintEnd} = this.props;

        const datesString = `from:${sprintStart} to:${sprintEnd}`

        return (
            <div>
                <div className="widget__header">
                    <span className="widget__header__subject">
                        {title}
                    </span>
                    <i className="fa fa-line-chart"/>
                </div>
                <div className="data">
                    <span>{text}</span>
                </div>
                <div className="dates">
                    <span>{datesString}</span>
                </div>
            </div>
        );
    }
}

Velocity.displayName = 'Velocity';

Velocity.propTypes = {
    projectID: PropTypes.string.isRequired,
    sprintStart: PropTypes.string.isRequired,
    sprintEnd: PropTypes.string.isRequired,
    title: PropTypes.string
};

Velocity.defaultProps = {
    title: 'Team velocity'
};

reactMixin(Velocity.prototype, ListenerMixin);
reactMixin(Velocity.prototype, Mozaik.Mixin.ApiConsumer);

export default Velocity;
