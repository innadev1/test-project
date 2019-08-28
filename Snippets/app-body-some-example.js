import Component, {make_component} 		from '../../../../modules/components';
import {ThreadMsgHeader, ReadBy} 		from './header';
import FooterActionsContainer 			from './footerActionsContainer';
import {checkAvatar} 					from '../../../../helpers/emailHelper';
import {Time}							from './time';
import {mark_unread, refresh_ico} 		from '../../../../helpers/icons';
import BodyActionsContainer 			from './BodyActionsContainer';
import {HoverPopover} 					from '../../../../helpers/popovers';
import {getParamUrl}			 		from '../../../../helpers/helper';
import {TableRowSkeletonOpenedThread} 	from '../../../loaders/spinner';
import moment 							from 'moment';
import {}								from 'moment-timezone';
import FlatPicker 						from "flatpickr";
import confirmDatePlugin 				from 'flatpickr/dist/plugins/confirmDate/confirmDate';
import {getState} 						from '../../../../state';
import {RESET_COMPOSE} 					from '../../../../actions/compose';
import {
	DEFAULT_COMPOSE_POPUP,
	VIEW_HISTORY
} from '../../../../constants';
import {
	CHANGE_VIEW,
	TOGGLE_VIEW_TEMPLATE,
	INFORM_USER,
	UPDATE_COMPOSE,
	UPDATE_COMPOSE_POPUP,
	UPDATE_COMPOSE_PROPS,
	UPDATE_STATE
} from '../../../../actions/index';
import {
	HISTORY_THREAD_MSG_SHOW,
	CHANGE_MESSAGE_LABEL,
	DISCARD_DRAFT,
	EDIT_DRAFT,
	UPDATE_HISTORY,
	CREATE_REMINDER,
	SHOW_HISTORY_DETAILS,
	TOGGLE_THREAD_EXPANDED,
	UPDATE_URL,
	SET_HISTORY_THREAD_GROUP_OPBJECTS
} from '../../../../actions/history';

export class ThreadMessageBody extends Component
{
	constructor(params)
	{
		super('article.thread-msg-container');

		this.isRead 	= params.isRead;
		this.threadId	= params.threadId;
		this.id			= params.id;
		this.domainList = params.domainList;
		this.params		= params;
	}

	getState()
	{
		const 	{history, filters} 				= getState(),
				{emails = [], selectedEmail} 	= filters,
				currentEmail					= (emails[selectedEmail] || {}),
				email							= currentEmail.name,
				{threadList = [], read, unread, thread} = history,
				currentMsg 	= threadList.find(msg => msg.id === this.params.id) || {};

		return {threadList, email, currentMsg, read, unread, thread};
	}

	setState({isDraftIdLoaded})
	{
		return super.setState({isDraftIdLoaded});
	}

	_renderer()
	{
		const {isDraftIdLoaded} = this.state;

		if(!isDraftIdLoaded)
		{
			const urlValue = getParamUrl('openedComposerDraft');

			if(this.params.draftId === parseInt(urlValue, 10)){
				EDIT_DRAFT(this.params);
				UPDATE_STATE({isDraftIdLoaded: true});
			}
		}
	}

	mount()
	{

		this.observe([
			new MsgShort(this.params, () => this.toggleDetails() ),
			this.addReminderBlock = new AddReminderBlock()
		]);
	}

	toggleDetails()
	{
			const 	{history = {}, filters = {}}	= getState(),
					{emails = [], selectedEmail} 	= filters,
					currentEmail					= (emails[selectedEmail] || {}),
					email							= currentEmail.name,
					{thread} = history;

		const 	{id, draftId, isPending} = this.params,
				toggleClasses = () => {
					if (this.context) {
						this.msgDetails.context.classList.toggle('hidden');
						this.context.classList.toggle('opened');
						this.context.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
						UPDATE_HISTORY({lastOpenedMessage: this.params});
						if(getParamUrl('expandedThread')){
							TOGGLE_THREAD_EXPANDED(true);
						}
						UPDATE_URL();
					}
				};

		if (!this.msgDetails) {
			if (id && !draftId && !isPending) {
				this.observe(new TableRowSkeletonOpenedThread());

				return HISTORY_THREAD_MSG_SHOW(id).then( response => {
					this.params = {...this.params, ...response, currentEmail : email};
					this.params.hasOwnerInEmails = emails.find(email => email.uid === thread.ownerUid) || false;
					this.msgDetails = new MsgDetails({
						params			: this.params,
						toggleDetails	: () => this.toggleDetails(),
						messageActions 	: {
							showReply		: actionType => {
								UPDATE_COMPOSE_POPUP({originalThreadId: this.threadId});
								this.showReply(actionType, {history, filters});
							},
							markAsUnread 	: () => markUnreadFrom(this.getState()),
							addReminder		: () => this.addReminderBlock.context.classList.toggle('active')
						}
					});

					if (this.params.isLast && this.params.groupObjects) {
						SET_HISTORY_THREAD_GROUP_OPBJECTS(this.params.groupObjects.filter(obj => obj.name !== 'gmailSelfThread'));
					}

					UPDATE_HISTORY({threadLoaderOpen: false});
					this.observe(this.msgDetails);
					toggleClasses();
				})
			} else if (draftId || isPending) {
				const draftDiscardedSuccessfullyFunc = () => {
					CHANGE_VIEW(VIEW_HISTORY);
					INFORM_USER('Draft discarded');
				};

				this.msgDetails = new MsgDetails({
					params			: this.params,
					toggleDetails	: () => this.toggleDetails(),
					messageActions 	: isPending ? {} : {
						discardDraft	: () => {
							RESET_COMPOSE();
							UPDATE_HISTORY({thread:{}});
							DISCARD_DRAFT(draftId).then(draftDiscardedSuccessfullyFunc);
						},
						editDraft		: originalThreadId => {
							EDIT_DRAFT({...this.params, subject : thread.subject, originalThreadId});
						}
					}
				});

				this.observe(this.msgDetails);
			}
		}

		toggleClasses();
	}

	showReply(actionType = 'reply', {filters = {}, history = {}})
	{
		const 	{subject, threadId} = this.params,
				{thread} 	= history,
				{ownerUid} 	= thread,
				{emails = [], selectedEmail} = filters;

		let currentEmail = (emails[selectedEmail] || {}),
			to 	= [],
			cc 	= [],
			bcc = [];

		switch (actionType) {
			case 'reply' :
				to = [this.params.from];
				break;

			case 'replyAll' :
				to 	= [...new Set([...this.params.to, this.params.from])];
				cc 	= this.params.cc;
				bcc = this.params.bcc;
				break;

			case 'forward' :
				to = [];// still not implemented
				break;
		}

		if (currentEmail.type !== 'email' && ownerUid) {
			currentEmail =  emails.find(email => email.uid === ownerUid) || {}
		}

		UPDATE_COMPOSE({
			recipientsSender : {
				auto 	: currentEmail || {},
				saved	: emails.filter(email => email.type === 'email')
			},
            recipients : {
                auto	: to.map(item => {return {...item, id : null}}),
                saved	: to
            },
            recipientsCc : {
                auto	: cc.map(item => {return {...item, id : null}}),
                saved	: cc
            },
            recipientsBcc : {
                auto	: bcc.map(item => {return {...item, id : null}}),
                saved	: bcc
            }
		});

		UPDATE_COMPOSE_PROPS({
			showCc		: cc.length,
			showBcc		: bcc.length,
			subject
		});

		UPDATE_COMPOSE_POPUP({
			...DEFAULT_COMPOSE_POPUP,
			showTemplateView : true,
			showComposePopup : true,
			originalThreadId : threadId,
			replyData : {
				text		: '',
				params 		: {...this.params, ownerUid},
				actionType
			}
		});

		TOGGLE_VIEW_TEMPLATE(true);
	}
}

export class MsgDetails extends Component
{
	constructor({params, toggleDetails, messageActions})
	{
		super('div.thread-msg pos-rlt hidden');

		params.canReply	= params.canReply && params.hasOwnerInEmails;

		this.params = params;
		this.toggleDetails = toggleDetails;
		this.messageActions = messageActions;
		this.maskEmails();
		this.urlifyHtml();
		this.customMount();
	}

	urlifyHtml()
	{
		const { html } = this.params;

		const createTextLinks = (text) => {
			return (text || '')
				.replace(/([^\S]|^)(((https?\:\/\/)|(www\.))(\S+))/gi,
					(match, space, url) => {
						let hyperlink = url;

						if (!hyperlink.match('^https?:\/\/')) {
							hyperlink = `http://${hyperlink}`;
						}
						return `${space}<a href="${hyperlink}" target="_blank">${url}</a>`;
					}
				);
		};

		if (html.includes('http://') || html.includes('https://')) {
			this.params.html = createTextLinks(html);
		}
	}

	customMount()
	{
		const 	{params, toggleDetails, messageActions}	= this,
				hasHTML 	= /<[a-z][\s\S]*>/i.test(params.html),
				hasExtra 	= params.html.indexOf('<div class="gmail_extra"'),
				hasQuote 	= params.html.indexOf('<blockquote class="gmail_quote"'),
				sliceArr 	= [hasExtra, hasQuote].filter(num => num > 0),
				slicePoint 	= Math.min.apply(null, sliceArr.length ? sliceArr : [0]),
				html 		= slicePoint ? params.html.substring(0, slicePoint) : params.html,
				quote 		= slicePoint ? params.html.substring(slicePoint, params.html.length) : '',
				{showReply} = messageActions;

		const body = make_component(`div.thread-msg-body ${hasHTML ? 'hasHtml' : 'wrapper'}`)
			.append([
				make_component('div', {innerHTML: html}),
				(slicePoint ? make_component('div.open-gmail-quote[...]', {
					id: 'gmailQuote',
					title: 'Show trimmed content',
					onclick: () => {
						document.getElementById(`gmailQuoteWrap${params.id}`).classList.toggle('hidden')
					}
				}) : ''),
				slicePoint ? make_component('div.hidden m-t-lg m-l-lg', {id: `gmailQuoteWrap${params.id}`, innerHTML: quote}) : ''
			]);

		[...body.context.querySelectorAll('a')].map(aEl => {
			aEl.target = '_blank';
		});

		const expandedMessageFooter =
			make_component('div.d-flex expanded-message-footer')
				.observe([
					new ReplyBtn({params, showReply}),
					new ReplyAllBtn({params, showReply}),
				]);

		this.observe([
			make_component(`div.thread-msg-panel ${params.isPending ? 'is-pending' : ''} ${params.draftId ? 'draft' : ''}`, {style : hasHTML ? '' : 'white-space:pre-line'})
				.observe([
					new ThreadMsgHeader({params, messageActions, toggleDetails}),
					body,
					expandedMessageFooter,
					ReadBy(params.readBy || {}),
					params.draftId ? new BodyActionsContainer({params, messageActions}) : ''
				]),
			params.isLast && !params.isPending ? new FooterActionsContainer({params, messageActions}) : ''
		]);
	}

	maskEmails()
	{
		let 	tmpHtml 		= this.params.html || '';
		const	emailList 		= [...new Set(tmpHtml.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi))],
				regexExclusion 	= new RegExp((this.params.domainList || []).join('|'));

		const getMaskedEmail = email => {
			const 	emailObj 	= email.split("@"),
					name 		= emailObj[0],
					domain 		= emailObj[1],
					halfLength	= Math.ceil(name.length / 2),
					newName		= name.substr(0, halfLength) + Array(halfLength + 2).join('*');

			return newName + '@' + domain;
		};

		emailList.map(email => {
			if (!regexExclusion.test(email.split("@")[1])) {
				tmpHtml = tmpHtml.split(email).join(getMaskedEmail(email));
			}
		});

		this.params.html = tmpHtml;
	}
}

class ReplyBtn extends Component
{
	constructor({params, showReply})
	{
		super(`div.historySendBtn[<i class="material-icons">reply</i>Reply]`, {
			onclick : (e) => {
				e.stopPropagation();

				if (!params.canReply || this.getState().hide) {
					return INFORM_USER("You cannot reply to this message.", 'error');
				}

				showReply('reply');
				UPDATE_HISTORY({lastOpenedMessage: params});
				UPDATE_URL();
			}
		});

		this.context.classList.toggle('hidden', !params.canReply || this.getState().hide);
		this.params = params;

		if(getParamUrl('openedReply') === 'reply' && showReply) {
			showReply('reply');
		}
	}

	getState()
	{
		const 	{filters = {}} = getState(),
				{emails = [], selectedEmail} = filters,
				email = emails[selectedEmail] || {},
				{limited} = email;

		return {hide : limited};
	}
}

class ReplyAllBtn extends Component
{
	constructor({params, showReply})
	{
		super(`div.historySendBtn[<i class="material-icons">reply_all</i>Reply All]`, {
			onclick : (e) => {
				e.stopPropagation();

				if (!params.canReply || (params.to.length + params.cc.length < 2) || this.getState().hide) {
					return INFORM_USER("You cannot reply to this message.", 'error');
				}

				showReply('replyAll');
				UPDATE_HISTORY({lastOpenedMessage: params})
				UPDATE_URL();
			}
		});

		const recipients = [...new Set([...params.to, ...params.cc, params.from])].filter(item => !params.hasOwnerInEmails || params.hasOwnerInEmails.name !== item.email);

		this.context.classList.toggle('hidden', !params.canReply || recipients.length < 2 || this.getState().hide);
		this.params = params;

		if(getParamUrl('openedReply') === 'replyAll'){
			showReply('replyAll');
		}
	}

	getState()
	{
		const 	{filters = {}} = getState(),
				{emails = [], selectedEmail} = filters,
				email = emails[selectedEmail] || {},
				{limited} = email;

		return {hide : limited};
	}
}

class SelectConditions extends Component
{
	constructor()
	{
		super(`form`, {
			onchange: e => {
				const 	{reminderConditions} = getState(),
						selectConditionsKeys = Object.entries(reminderConditions);

				selectConditionsKeys.map(
				selectConditionsKeys => {
					if (selectConditionsKeys[1] === e.target.value) {
						UPDATE_HISTORY({reminderCondition: selectConditionsKeys[0]});
					}
				});
			}
		});
	}

	setState({reminderConditions})
	{
		const {noreply, anycase} = reminderConditions;

		return super.setState({noreply, anycase});
	}

	_renderer()
	{
		const {noreply, anycase} = this.state;

		this.context.innerHTML = '';

		this.append([
			make_component('label.d-flex')
				.append([
					make_component(`input[${noreply}]`, {value: noreply, type: 'radio', name: 'option', checked: 'checked'}),
					make_component('p', {innerText:noreply})
				]),
			make_component('label.d-flex')
				.append([
					make_component(`input[${anycase}]`, {value: anycase, type: 'radio', name: 'option'}),
					make_component('p', {innerText:anycase})
				])
		]);
	}
}

class SelectOptions extends Component
{
	constructor()
	{
		super('select.option-select', {
			onchange: e => {
				const 	{reminderOptions} = getState(),
						selectOptionsKeys = Object.entries(reminderOptions);

				selectOptionsKeys.map(
				selectOptionsKeys => {
					if (selectOptionsKeys[1] === e.target.value) {
						UPDATE_HISTORY({reminderOption: selectOptionsKeys[0]})
					}
				});
			},
		});
	}

	setState({reminderOptions})
	{
		const selectOptionsValues = Object.values(reminderOptions);
		
		return super.setState({selectOptionsValues});
	}

	_renderer()
	{
		const 	{selectOptionsValues} 	= this.state;

		this.append(selectOptionsValues.map(
			selectOptionsValues => {
				return make_component(`option[${selectOptionsValues}]`, {value: selectOptionsValues});
			})
		);
	}

}

export class AddReminderBlock extends Component
{
	constructor()
	{
		super(`div.set-reminder`);
	}

	mount() 
	{
		this.customDateTime = make_component('input',
			{
				placeholder: `Set custom date and time`,
				readOnly: `readOnly`,
				onclick: () => {
					this.picker.open();
				},
			});

		this.observe([
			make_component(`p`, {innerHTML: 'Select condition:'}),
			new SelectConditions(),
			make_component(`p`, {innerHTML: 'Select time from list:'}),
			new SelectOptions(),
			make_component(`p`, {innerHTML: 'Or'}),
			this.customDateTime,
			make_component('div.d-flex')
				.observe([
					make_component(`button`, {
						innerText: 'Set reminder',
						onclick: () => {
							const 	{history = {}} = getState(),
									{thread = {}, threadList = [], reminderOption, reminderCondition, customDatetime, userTimezone} = history,
									firstElem = threadList[0],
									{id} = thread,
									data = {
										messageId : firstElem.id,
										reminderOption: reminderOption,
										reminderCondition: reminderCondition,
										threadId: id,
										customDatetime: customDatetime,
										userTimezone: userTimezone,
										email: firstElem.from.email
									};

							CREATE_REMINDER(data);
							SHOW_HISTORY_DETAILS(thread);
						},
					}),
					make_component(`button`, {
						innerText: 'Close',
						onclick: () => {
							this.context.classList.remove('active')
						}
					})
				])
		]);

		this.picker = make_picker(this.customDateTime);

		if (this.picker.calendarContainer) {
			this.picker.calendarContainer.querySelector('.flatpickr-confirm').onclick = e => {
				const {serverTimeZone} = getState();

				e.stopPropagation();

				UPDATE_HISTORY({
					userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					reminderOption: 'custom',
					customDatetime: moment(this.picker.selectedDates[0]).tz(serverTimeZone).format('YYYY-MM-DD HH:mm:ss')
				});
			};

			this.picker.calendarContainer.querySelectorAll('span').forEach(item => {
				item.onclick = e => {
					e.stopPropagation();
				}
			})
		}
	}

	destroy()
	{
		super.destroy();
		this.picker.destroy();
		this.picker = null;
		this.customDateTime = null;
	}
}

const make_picker = (context, props) => {
	return FlatPicker( context.getContext(), {
		minDate			: new Date(),
		altInput		: true,
		allowInput		: false,
		altFormat		: window.apiData.formatter.time !== 'h:mm A' ? 'M d, H:i' : 'M d, h:i K',
		enableTime		: true,
		time_24hr		: window.apiData.formatter.time !== 'h:mm A',
		plugins			: [
			confirmDatePlugin()
		],
		onClose			: (selectedDates, dateStr) => {
			if (props && props.onClose) {
				props.onClose(dateStr);
			}
		}
	});
};

export class MsgShort extends Component
{
	constructor( params, toggleDetails )
	{
		super('table.table-list', {
			onclick : toggleDetails
		});

		this.params = params || {};
	}

	setState({filters, history})
	{
		const 	{emails 	= [], selectedEmail} = filters,
				email 		= (emails[selectedEmail] || {}).name,
				{threadList = [], read, thread} = history,
				currentMsg 	= threadList.find(msg => msg.id === this.params.id) || {},
				isUnread	= currentMsg.unread;

		return super.setState({threadList, email, currentMsg, isUnread, read, thread});
	}

	getState()
	{
		const 	{history, filters} 				= getState(),
				{emails = [], selectedEmail} 	= filters,
				currentEmail					= (emails[selectedEmail] || {}),
				email							= currentEmail.name,
				{threadList = [], read, unread, thread} = history,
				currentMsg 	= threadList.find(msg => msg.id === this.params.id) || {},
				isUnread	= currentMsg.unread;

		return {threadList, email, currentMsg, isUnread, read, unread, thread};
	}

	mount()
	{
		const 	currentMsg 	= this.params,
				time 		= new Time(currentMsg),
				subLabel 	= currentMsg.isPending ? 'In queue for sending' : null;

		this.markUnreadBtn = make_component(`span.circle-effect t-f-size-15[${mark_unread()}]`, {
			onclick : e => {
				e.stopPropagation();
				markUnreadFrom(this.getState());
			}
		});

		const markReadUnreadBtnContainer = make_component('span').append([
			this.markUnreadBtn
		]);

		this.popover = HoverPopover({
			classes		: 'hover-hint',
			target 		: markReadUnreadBtnContainer.context,
			position	: 'left center',
			content 	: () => {
				return '<div class="text-center">Mark unread from here</div>';
			}
		});

		const getSubLabel = () => {
			let res = '';

			if (subLabel) {
				res = 	`<td class="text-right">
							<span class="t-f-size-13 font-bold">${subLabel}
							${currentMsg.isPending ? `<span class="pending-icon is-loading-rotation v-align-mid">${refresh_ico()}</span>` : ''}</span>
						</td>`;
			}

			return res;
		};

		const contentHtml = `<tr class="t-pointer t-hover ${(currentMsg.isPending ? 'is-pending' : '')}">
								<td class="thread-avatar"><div class="thread-avatar-container">${checkAvatar(currentMsg)}</div></td>
								<td class="thread-preview no-scroll-wrap">
									<div class="thread-sender">${(currentMsg.senderName && currentMsg.senderName.length ? currentMsg.senderName : currentMsg.sender)} 
									${(currentMsg.draftId ? '<span class="draft-label">Draft</span>' : '')}</div>
									<div class="thread-snippet">${currentMsg.snippet || ''}</div>
								</td>
								<td></td>
								${getSubLabel()}
								<td class="no-wrap thread-date" title="${currentMsg.sendTimeFull}">${time.getLongDate()}</td>
							</tr>`;

		this.observe(
			make_component(`tr.t-pointer t-hover ${currentMsg.isPending ? 'is-pending' : ''}`, {
				innerHTML : contentHtml
			})
		)
	}

	_renderer()
	{
		const {isUnread} = this.state;

		if (this.markUnreadBtn) {
			this.markUnreadBtn.getContext().classList.toggle('hidden', isUnread);
		}
	}

	destroy()
	{
		super.destroy();

		if (this.popover) {
			this.popover.destroy();
		}

		this.markUnreadBtn.destroy();

		delete this.markUnreadBtn;
		delete this.params;
	}
}

const getMessageIdsFrom = (threadList, idFrom) => {
	let idFromPassed = false;

	const ids = threadList.filter(msg => {
		if (msg.id === idFrom) {
			idFromPassed = true;
		}

		return idFromPassed ? true : false;
	}).map(msg => msg.id);

	return ids;
};

const markUnreadFrom = ({threadList, currentMsg, email, read, unread, thread}) => {
	const 	msgIds 	= getMessageIdsFrom(threadList, currentMsg.id),
			{owner} = [...read.threads, ...unread.threads].filter(item => item.id === thread.id)[0] || {};

	CHANGE_MESSAGE_LABEL({
        messageIds 		: msgIds,
        email			: email,
        removeLabels	: '["READ"]',
        addLabels		: '["UNREAD"]',
		owner
    }).then(() => {
		const newThreadList = threadList.map(msg => {
			if (msgIds.includes(msg.id)) {
				msg.unread = true;
				msg.isRead = false;
			}

			return msg;
		});

		read.threads = read.threads.map(item => {
			if (item.id === thread.id) {
				item.unread = true;
				item.isRead = false;
			}

			return item;
		});

		CHANGE_VIEW(VIEW_HISTORY);
		INFORM_USER(`Message${msgIds.length > 1 ? 's' : ''} successfully marked as unread`);
	});
};