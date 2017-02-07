import React, { Component, PropTypes } from 'react'; // eslint-disable-line no-unused-vars
import reactMixin                       from 'react-mixin';
import { ListenerMixin }                from 'reflux';
import Mozaik                           from 'mozaik/browser';
const classNames = require('classnames');

class AgileBoardState extends Component {

    constructor(props) {
        super(props);

        this.state = {
            renderIterations: 1,
            currentStateHighlight: 0,
            agileBoardState: [],
            timer: null,
        };
    }

    getApiRequest() {
        const { agileID } = this.props;

        return {
            id: `youtrack.agileBoardState.${agileID}`,
            params: {
                title: this.props.title,
                agileID,
            }
        };
    }

    onApiData(data) {
        let newState = {
            agileBoardState: data
        }

        // set timer first time only
        if(this.state.timer === null) {
            newState.currentStateHighlight = 0;

            newState.timer = setInterval(() => {
                const nextIndex = this.getNextStateIndex();
                this.setState({
                    currentStateHighlight: nextIndex
                })
            }, 1500 );
        }

        this.setState(newState);
    }

    getNextStateIndex() {
        const { agileBoardState } = this.state;

        if(agileBoardState.length !== 0){
            if(this.state.currentStateHighlight === agileBoardState.length - 1)
                return 0;
            return this.state.currentStateHighlight + 1;
        }
    }

    shouldMarkerRender(markerIndex) {
        return markerIndex === this.state.currentStateHighlight;
    }

    getCurrentStageName() {
        const obj = this.state.agileBoardState[this.state.currentStateHighlight];

        if(obj)
            return obj.name;
        return '';
    }

    render() {
        const stages = this.state.agileBoardState || 'Calculating ...';
        const { title } = this.props;

        if(typeof stages === 'string') {
             return (
                <div className="data">
                    {stages}
                </div>
            );
        }

        const maxHeight = Math.max(...stages.map(el => el.current));

        const columnWidth = Math.floor(94 / stages.length);
        const backgroundStyle = {
            width: `${columnWidth}%`
        }

        let columns = [];

        stages.forEach( (stage) => {
            const itemHeight = Math.floor(100 * stage.current / maxHeight);

            const foregroundStyle = {
                height: `${itemHeight}%`
            }

            const exceeds = stage.max && stage.current > stage.max;

            const foregroundClasses = classNames({
                youtrack__column_fg: true,
                youtrack__column_fg__exceeds: exceeds
            })

            const textClasses = classNames({
                youtrack__column__text: true,
                youtrack__column__text__exceeds: exceeds
            })

            const shouldDisplayMarker = this.shouldMarkerRender(stage.index);

            const markerClasses = classNames({
                youtrack__column_highlight: true,
                'youtrack__column_highlight-active': shouldDisplayMarker
            });

            columns.push((
                <div key={stage.index} className="youtrack__column_bg" style={backgroundStyle} >
                    <div className={foregroundClasses} style={foregroundStyle}></div>
                    <span className={textClasses}>{stage.current}</span>
                    <div className={markerClasses}></div>
                </div>
            ));
        });

        return (
            <div>
                <div className="widget__header">
                    <span className="widget__header__subject">
                        {title}
                    </span>
                    <i className="fa fa-tasks"/>
                </div>
                <div className="widget__body">
                    <div className="youtrack__columns_wrapper" >
                        {columns}
                    </div>
                    <div className="youtrack__column_legend">
                        {this.getCurrentStageName()}
                    </div>
                </div>
            </div>
        );
    }
}

AgileBoardState.displayName = 'AgileBoardState';

AgileBoardState.propTypes = {
    agileID: PropTypes.string.isRequired,
    title: PropTypes.string
};

AgileBoardState.defaultProps = {
    title: 'YoutTrack agile state'
};

reactMixin(AgileBoardState.prototype, ListenerMixin);
reactMixin(AgileBoardState.prototype, Mozaik.Mixin.ApiConsumer);

export default AgileBoardState;
