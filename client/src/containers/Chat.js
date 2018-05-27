import React, { Component } from 'react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import { LOAD_MESSAGES, UNCHECK_AUTH_TOKEN, UPDATE_MESSAGE_FIELD, MESSAGE_SENT, SCROLL_TOP } from '../constants/actionTypes';
import AppBar from 'material-ui/AppBar';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import Avatar from 'material-ui/Avatar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import { connect } from 'react-redux';
import agent from '../agent';
import axios from 'axios';
import { Scrollbars } from 'react-custom-scrollbars';
import moment from 'moment';

const appBarStyles = {
    'margin': '-16px -16px 0',
    'width': 'auto'
}

const mapStateToProps = state => ({ ...state.chat, ...{ username: state.auth.session.user.username, authenticated: state.auth.session.authenticated}});

const mapDispatchToProps = dispatch => ({
    getMessages: (query) => agent.Chat.getMessages(query).then( res => {
        dispatch({ type: LOAD_MESSAGES, payload: res.data })}),
    onChangeMessageText: value =>
        dispatch({type: UPDATE_MESSAGE_FIELD, value}),
    onMessageSend: (username, text) =>
        agent.Chat.sendMessage(username, text).then( res => {
            dispatch({ type: MESSAGE_SENT });
            dispatch({ type: LOAD_MESSAGES, payload: [res.data] });

        }),
    onLogout: () => {
        window.localStorage.removeItem('token');
        axios.defaults.headers.common['Authorization'] = '';
        dispatch({ type: UNCHECK_AUTH_TOKEN })
    },
    onScroll: (scrolltop) => {
        dispatch({type: SCROLL_TOP, payload: scrolltop})
    }
})

class Chat extends Component {
    constructor(props) {
        super(props);
        this.changeMessageText = ev => this.props.onChangeMessageText(ev.target.value);
        this.sendMessage = () => this.props.onMessageSend(this.props.username, this.props.messageText);
        this.logOut = () => this.props.onLogout();
    }
    componentDidMount () {
        setInterval(function() { if (this.props.authenticated) {
            this.props.getMessages(composeFetchMessagesQuery('after',this.props.lastRecievedMessageTs, 20))
        }}.bind(this), 3000);
    }
    componentWillMount () {
        this.props.getMessages(composeFetchMessagesQuery());
    }
    render () {
        return (
            <div>
                <TopBar onLogout={this.logOut} />
                <MessagesList scrollTop={this.props.scrollTop} onScroll={this.props.onScroll} ref='messages' user={this.props.username} messages={this.props.messages}/>
                <InputMessageArea messageText={this.props.messageText} submitHandler={this.sendMessage} inputHandler={this.changeMessageText}/>
            </div>
        )
    }
}

class TopBar extends Component {
    render () {
        return (
            <div>
                <AppBar
                    className="chat__header"
                    style={appBarStyles}
                    title="Chat 1.0.1"
                    iconElementRight={<IconButton
                        onClick={this.props.onLogout}
                        tooltip="Logout"
                        iconClassName="material-icons"
                    >
                        power_settings_new
                    </IconButton>}
                />
            </div>
        )
    }
}
class MessagesList extends Component {

    constructor(props) {
        super(props);
        this.onScrollHandler = () =>  {
            const scrollTop = this.refs.scroll.view.scrollTop;
            this.props.scrollTop !== !scrollTop ?
            this.props.onScroll(!scrollTop) : null;
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.refs.messagesEnd.scrollIntoView({block: "end", behavior: "smooth"})
    }
    shouldComponentUpdate(nextProps, nextState) {
        return this.props.messages.length !== nextProps.messages.length
    }
    render () {
        const messages = this.props.messages ? this.props.messages : [];
        const user = this.props.user;
        const isSelf = function (username) {
            return user === username;
        }

        const messagesListItems = messages.map((message) =>
        {
            let nameSplited = message.username.split(' ');
            let initials = nameSplited.length === 1 ? nameSplited[0].substr(0,2) : nameSplited.map((name) => name[0]).join('').substr(0,2);

            return <li key={message._id} className={"message " + ( isSelf(message.username) ? "message_self" : "" ) }>
                <Avatar className="message__avatar">{ initials }</Avatar>
                <div className="message__container">
                    { !isSelf(message.username) ? <div className="message__username">{message.username}</div> : ''}
                    <div className="message__text">{message.text}</div>
                    <div className="message__date-time"> {moment.unix(message.dateTime).format('HH:mm DD.MM.YY') } </div>
                </div>
            </li>
        }

        );

        return (
            <div className='chat__messages'>
                <Scrollbars
                    ref="scroll"
                    renderTrackHorizontal={({ style, ...props }) =>
                        <div {...props} style={{ ...style, display: 'none' }}/>
                    }
                    onScroll={this.onScrollHandler}
                    autoHide
                    autoHideTimeout={1000}
                    autoHideDuration={200}
                >
                    <div style={{ float:"left", clear: "both" }}
                         ref='messagesStart'>
                    </div>
                    <ul>
                        {messagesListItems}
                    </ul>
                    <div style={{ float:"left", clear: "both" }}
                         ref='messagesEnd'>
                    </div>
                </Scrollbars>
            </div>
        )
    }
}
class InputMessageArea extends Component {
    handleKeyPress = (event) => {
        if(event.key == 'Enter'){
            event.preventDefault();
            this.props.submitHandler();
        }
    }
    render () {
        return (
            <Paper className="chat__input-area" zDepth={2}>
                <TextField
                    className="chat__text-field"
                    hintText="Write message..."
                    multiLine={true}
                    rows={1}
                    rowsMax={2}
                    value={this.props.messageText}
                    defaultValue={this.props.messageText}
                    onChange={this.props.inputHandler}
                    onKeyPress={this.handleKeyPress}
                />
                <FloatingActionButton onClick={this.props.submitHandler} className="chat__send-button">
                    <FontIcon className="material-icons">send</FontIcon>
                </FloatingActionButton>
            </Paper>
        )
    }
}

const composeFetchMessagesQuery = (q, ts, c) => {
    const query = q ? ( q + '/' ) : 'before/';
    const timestamp = ts ? ( ts + '/' ) : ( moment().unix() + '/' );
    const count = c ? c : 40;
    return ( query + timestamp + count )
}

export default connect(mapStateToProps, mapDispatchToProps)(Chat);