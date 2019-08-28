import Component 					from '../../../modules/components';
import {GroupContainer} 			from '../../history/listView/group/container';
import {make_component} 			from '../../../modules/components';
import {getState} 					from '../../../state';
import {
	VIEW_HISTORY,
	VIEW_HISTORY_THREAD_LIST,
	DEFAULT_SEARCH_FORM
} 									from '../../../constants';
import {
	SHOW_HISTORY_DETAILS,
	UPDATE_HISTORY,
	HISTORY_CHANGE_FILTER_OR_FOLDER,
	BULK_READ,
	BULK_UNREAD,
	BULK_LABEL,
	BULK_CREATE_REMINDERS,
	BULK_DELETE_REMINDERS,
	BULK_DISCARD
} 									from '../../../actions/history';
import {
	CHANGE_VIEW, 
	INFORM_USER,
	UPDATE_STATE
} 									from '../../../actions/index';
import {
	SelectConditions, 
	SelectOptions
}									from '../../containers/history/reminderSettings';
import moment 						from 'moment';
import {}							from 'moment-timezone';
import {make_picker}			 	from '../../../helpers/makePicker';
import {resetCheckboxes, checkSelectedList} from '../../../helpers/threadHelper';
import {HoverPopover} 				from '../../../helpers/popovers';

export class HistoryListView extends Component
{
	constructor()
	{
		super('div.col yh-scroller container-history');

		const {isStandalone, threadNavigation} = getState();

		if (isStandalone || threadNavigation) {
			document.body.addEventListener('keyup', function(e) {
				const 	{history, view, composePopup} = getState(),
						{isMessageLoading, quickSearchItem} = history,
						key = e.which;
				
				if (view === VIEW_HISTORY_THREAD_LIST && !quickSearchItem && !isMessageLoading &&
					(key > 36 && key < 41) &&
					(!composePopup.showComposePopup || composePopup.isMinimized)
				) {
					const currentThreadId = history.thread.id;
					let	checkingThreadList = [],
						currentThreadIndex = null,
						id = null,
						subject = '',
						draftId = null,
						ownerUid = null,
						currentListName = '';
			
					history.unread.threads.map((el, index) => {
						if (currentThreadId === el.id) {
							checkingThreadList = history.unread.threads;
							currentThreadIndex = index;
							currentListName = 'unread';
						}
					});

					history.read.threads.map((el, index) => {
						if(currentThreadId === el.id) {
							checkingThreadList = history.read.threads;
							currentThreadIndex = index;
							currentListName = 'read';
						}
					});

					//next
					if (key === 39 || key === 40) {
						if (currentListName === 'unread') {
							if (currentThreadIndex+1 === checkingThreadList.length) {
								checkingThreadList = history.read.threads;
								currentThreadIndex = 0;
							} else {
								currentThreadIndex = currentThreadIndex+1;
							}
						}
						
						if(currentListName === 'read') {
							if (currentThreadIndex < checkingThreadList.length) {
								currentThreadIndex = currentThreadIndex+1;
							}
						}
					}

					//previous
					else if (key === 37 || key === 38) {
						if (currentListName === 'unread') {
							if (currentThreadIndex >= 0) {
								currentThreadIndex = currentThreadIndex-1;
							}
						}

						if (currentListName === 'read') {
							if (currentThreadIndex === 0) {
								checkingThreadList = history.unread.threads;
								currentThreadIndex = checkingThreadList.length-1;
							} else {
								currentThreadIndex = currentThreadIndex-1;
							}
						}
					}

					checkingThreadList.map((el, index) => {
						if(currentThreadIndex === index){
							id = el.id;
							subject = el.subject;
							draftId = el.draftId;
							ownerUid = el.ownerUid;
							SHOW_HISTORY_DETAILS({id, subject, draftId, ownerUid})
						}
					})
				}
			});	
		}
	}

	setState({view, history})
	{
		const { isThreadExpanded, quickSearchItem = null } = history,
				historyListShown = isThreadExpanded || quickSearchItem;

		return super.setState({historyListShown, view});
	}

	mount()
	{
		this.observe([
			new TopBlock(),
			make_component('div', {style: 'padding-top: 36px'})
				.observe([
					new BulkAddReminderBlock(),
					new BulkLabelBlock(),
					new GroupContainer('unread'),
					new GroupContainer('read')					
				])
		])
	}

	_renderer()
	{
		const 	{view, historyListShown} = this.state,
				canView = [
					VIEW_HISTORY,
					VIEW_HISTORY_THREAD_LIST
				],
				mini = [
					VIEW_HISTORY_THREAD_LIST
				];

		this.context.classList.toggle('col-xl-12', !mini.includes(view));
		this.context.classList.toggle( 'col-xl-3', mini.includes(view));
		this.context.classList.toggle( 'is-minimized', mini.includes(view));
		this.context.classList.toggle( 'd-none', !canView.includes(view) || historyListShown);
	}
}

export class TopBlock extends Component
{
	constructor()
	{
		super('div.top-thread-block alert d-flex align-items-center');
	}

	mount()
	{
		this.observe([
			new BulkActionCheckbox(),
			new BulkActionsMenu(),
			new ReminderNotificationBlock()
		])
	}
}

export class ReminderNotificationBlock extends Component
{
	constructor()
	{
		super('div.d-flex reminder-notification-block');

		this.activeReminderCount = 0;
		this.emailType = '';
	}

	mount()
	{	
		this.observe([
			new ReminderNotificationCount,
			make_component('a', {
				innerHTML: 'view threads',
				onclick		: () => {
					getState().history.tableLength.map(object => {
						if (object.id === 'REMINDER') {
							this.loadUnread = object.loadUnread;
							this.unreadCount = object.unreadCount;
							this.activeReminderCount = object.activeReminderCount;
						}
					});
	
					UPDATE_HISTORY({
						search: '',
						searchForm : DEFAULT_SEARCH_FORM,
						activeFolder : {
							id: 'REMINDER',
							name : 'Reminder',
							loadUnread: this.loadUnread,
							unreadCount: this.unreadCount,
							activeReminderCount: this.activeReminderCount
						}
					});
	
					HISTORY_CHANGE_FILTER_OR_FOLDER();
				}
			})
		])
	}

	setState({history, canSeeReminders, filters})
	{
		const {tableLength, activeFolder} = history;

		Object.entries(filters.emails).map((element) => {
			if (parseInt(element[0], 10) === filters.selectedEmail) {
				this.emailType = element[1].type;
			}
		});

		tableLength.map(object => {
			if (object.id === 'REMINDER') {
				this.activeReminderCount = object.activeReminderCount;
			}
		});

		return super.setState({
			hide : !canSeeReminders || this.emailType !== 'email' || !this.activeReminderCount || activeFolder.name !== 'Inbox'
		});
	}

	_renderer()
	{
		const {hide} = this.state;

		this.context.classList.toggle('hidden', hide);
	}
}

class ReminderNotificationCount extends Component
{
	constructor()
	{
		super('p');
	}

	setState({history})
	{
		const {tableLength} = history;

		let activeReminderCount = 0;

		tableLength.map(object => {
			if (object.id === 'REMINDER') {
				activeReminderCount = object.activeReminderCount;
			}
		});

		return super.setState({activeReminderCount});
	}

	_renderer()
	{
		const {activeReminderCount} = this.state;

		this.context.innerHTML = '';

		this.append(
			make_component(`span`, {innerHTML: `Active reminder count: ${activeReminderCount} -&nbsp;`})
		);
	}
}
class BulkActionsMenu extends Component
{
	constructor()
	{
		super('div.bulk-actions-menu d-flex align-center hidden');
	}

	setState({isSomeChecked, selectedUnread, selectedWithReminders, history})
	{
		const {tableLength} = history;

		return super.setState({isSomeChecked, selectedUnread, selectedWithReminders, tableLength})
	}

	_renderer()
	{
		const {isSomeChecked, selectedUnread, selectedWithReminders, tableLength} = this.state;

		this.context.innerHTML = '';


		const labelType = tableLength.filter(el => {
			return el.type === 'user';
		});

		this.append([
			make_component('div.bulk-actions d-flex')
				.observe([
					make_component('span.d-flex',{
						innerHTML: `<i class="material-icons">delete</i>
									<div class="hover-tooltip">Discard</div>`})
						.observe(this.discard),
					make_component('span.d-flex',{
						innerHTML: `<i class="material-icons">${selectedUnread.length > 0 ? 'drafts' : 'markunread'}</i>
						<div class="hover-tooltip">${selectedUnread.length > 0 ? 'Mark as read' : 'Mark as unread'}</div>`})
						.observe(this.markReadUnreadBtn),
					make_component('span.d-flex bulk-reminder-icon',{
						innerHTML: `<i class="material-icons">${selectedWithReminders.length > 0 ? 'alarm_off' : 'add_alarm'}</i>
						<div class="hover-tooltip">${selectedWithReminders.length > 0 ? 'Discard reminder' : 'Add reminder'}</div>`})
						.observe(this.reminderSetUnset),

					labelType.length > 0 ?
						make_component('span.d-flex bulk-label-icon',{
							innerHTML: `<i class="material-icons">label</i>
							<div class="hover-tooltip">Label</div>`})
							.observe(this.labelSet)
					: ''					

				])
		]);

		this.context.classList.toggle('hidden', !isSomeChecked);
	}

	mount()
	{
		const 	{history} = getState(),
				{isBulkLabelOpen, isBulkReminderOpen} = history;

		this.discard = make_component(`div.action-block`, {
			onclick: () => {
				const selectedThreadList = getState().selectedThreadList,
					data = {
						threads: selectedThreadList,
						add: ['Trash'],
						remove: ['Inbox']
					};

				BULK_DISCARD(data).then(
					() => {
						CHANGE_VIEW(VIEW_HISTORY);
						INFORM_USER('Threads are moved to trash');
						resetCheckboxes()
					}
				)
			}
		});

		this.markReadUnreadBtn 	= make_component(`div.action-block`, {
			onclick: () => {
				const {selectedThreadList, selectedUnread} = getState();

				if(selectedUnread.length > 0){
					BULK_READ(selectedThreadList).then(
						() => {
							CHANGE_VIEW(VIEW_HISTORY);
							INFORM_USER('Marked as read');
							resetCheckboxes()
						}
					)
				} else {
					BULK_UNREAD(selectedThreadList).then(
						() => {
							CHANGE_VIEW(VIEW_HISTORY);
							INFORM_USER('Marked as unread');
							resetCheckboxes()
						}
					)
				}
			}
		});

		this.labelSet 	= make_component(`div.action-block`, {
			onclick: () => {
				UPDATE_HISTORY({isBulkLabelOpen: !isBulkLabelOpen});
			}
		});

		this.reminderSetUnset 	= make_component(`div.action-block`, {
			onclick: () => {
				const {selectedWithReminders} = getState();

				if(selectedWithReminders.length > 0){
					const 	{selectedThreadList, filters} = getState(),
							{emails = [], selectedEmail} = filters,
							currentEmail				 = emails[selectedEmail] || {},
							data = {
								threads: selectedThreadList,
								email: currentEmail.name
							};

					BULK_DELETE_REMINDERS(data).then(
						() => {
							CHANGE_VIEW(VIEW_HISTORY);
							INFORM_USER('Reminders deleted');
							resetCheckboxes()
						}
					)					
				} else {
					UPDATE_HISTORY({isBulkReminderOpen: !isBulkReminderOpen});
				}
			}
		});
	}
}

class BulkActionCheckbox extends Component
{
	constructor()
	{
		super('div.bulk-actions-checkbox');
	}

	setState({history, isSomeChecked})
	{
		const {isBulkCkeckboxMenuOpen} = history;

		return super.setState({isBulkCkeckboxMenuOpen, isSomeChecked})
	}

	_renderer()
	{
		const {isBulkCkeckboxMenuOpen, isSomeChecked} = this.state;

		this.checkboxMenu.context.classList.toggle('active', isBulkCkeckboxMenuOpen)

		this.context.innerHTML = '';

		this.checkbox = 
		make_component('label.action')
		.observe([
			make_component('input.bulk', {
				type: 'checkbox', 
				onclick: e => {
					e.stopPropagation();
				},
				onchange: () => {
					this.selectOrUnselectAll();
				}
			}),
			make_component('span.marked',{
				onclick: e => {
					e.stopPropagation();
				}
			})					
		]);
		
		this.checkboxComponent = 
			make_component('div.checkbox-block')
			.observe([
				isSomeChecked ? this.checkboxDelete : this.checkbox,
				this.arrow
			]);

		this.append([
			this.checkboxComponent,
			this.checkboxMenu
		]);
	}

	mount()
	{
		this.checkboxDelete =
			make_component('div.checkbox-action-delete', {
				onclick: () => {
					this.unselectAll()
				},
			});

		this.arrow = 
			make_component('div.arrow-bottom', {
				innerHTML: `<i class="material-icons">arrow_drop_down</i>`,
				onclick: e => {
					e.stopPropagation();
					UPDATE_HISTORY({isBulkCkeckboxMenuOpen: !getState().history.isBulkCkeckboxMenuOpen})
				}
			});

		this.checkboxMenu = 
			make_component('div.checkbox-menu-dropdown')
				.observe([
					make_component('p', {
						innerText: 'All',
						onclick: () => {
							this.selectAll()
						},
					}),
					make_component('p', {
						innerText: 'None',
						onclick: () => {
							this.unselectAll()
						},
					}),
					make_component('p', {
						innerText: 'Read',
						onclick: () => {
							this.unselectAll(),
							this.selectRead()
						},
					}),
					make_component('p', {
						innerText: 'Unread',
						onclick: () => {
							this.unselectAll(),
							this.selectUnread()
						},
					}),
				]);

		HoverPopover({
			classes		: 'hover-hint',
			target		: this.arrow.context,
			position	: 'bottom center',
			content		: '<div class="text-center">Select</div>'
		});

	}

	selectAll()
	{
		const 	{history} = getState(),
				{read, unread} = history,
				items = document.getElementsByClassName('bulk');

		UPDATE_STATE({isAllChecked: true});

        for (let i = 0; i < items.length; i++) {
			if (items[i].type === 'checkbox')
			{
                items[i].checked = true;				
			}
		}

		unread.threads.map((el,index) => {
			const tmpcurrentListName = history.unread;

			tmpcurrentListName.threads[index].isSelected = true;
			UPDATE_HISTORY({unread: tmpcurrentListName});
		});

		read.threads.map((el,index) => {
			const tmpcurrentListName = history.read;

			tmpcurrentListName.threads[index].isSelected = true;
			UPDATE_HISTORY({read: tmpcurrentListName});
		});

		this.resetCheckboxes();
	}

	unselectAll()
	{
		const 	{history} = getState(),
				{read, unread} = history,
				items = document.getElementsByClassName('bulk');

		UPDATE_STATE({isAllChecked: false});

        for (let i = 0; i < items.length; i++) {
			if (items[i].type === 'checkbox')
			{
                items[i].checked = false;				
			}
		}

		unread.threads.map((el,index) => {
			const tmpcurrentListName = history.unread;

			tmpcurrentListName.threads[index].isSelected = false;
			UPDATE_HISTORY({unread: tmpcurrentListName});
		});

		read.threads.map((el,index) => {
			const tmpcurrentListName = history.read;

			tmpcurrentListName.threads[index].isSelected = false;
			UPDATE_HISTORY({read: tmpcurrentListName});
		});

		this.resetCheckboxes();
	}

	selectRead()
	{
		const 	{history} = getState(),
				items = document.getElementsByClassName(`label-read`);

		UPDATE_STATE({isreadChecked: true})

        for (let i = 0; i < items.length; i++) {
			if (items[i].type === 'checkbox')
			{
                items[i].checked = true;				
			}
		}

		history.read.threads.map((el, index) => {
			const tmpcurrentListName = history.read;

			tmpcurrentListName.threads[index].isSelected = true;
			UPDATE_HISTORY({read: tmpcurrentListName});
		});

		this.resetCheckboxes();
	}

	selectUnread()
	{
		const 	{history} = getState(),
				items = document.getElementsByClassName(`label-unread`);

		UPDATE_STATE({isunreadChecked: true})

        for (let i = 0; i < items.length; i++) {
			if (items[i].type === 'checkbox')
			{
                items[i].checked = true;				
			}
		}

		history.unread.threads.map((el, index) => {
			const tmpcurrentListName = history.unread;

			tmpcurrentListName.threads[index].isSelected = true;
			UPDATE_HISTORY({unread: tmpcurrentListName});
		});

		this.resetCheckboxes();
	}

	selectOrUnselectAll()
	{
		const 	{isAllChecked, history} = getState(),
				{read, unread} = history,
				items = document.getElementsByClassName('bulk');

		UPDATE_STATE({isAllChecked: !isAllChecked});

        for (let i = 0; i < items.length; i++) {
			if (items[i].type === 'checkbox')
			{
                items[i].checked = !isAllChecked;				
			}
		}

		unread.threads.map((el,index) => {
			const tmpcurrentListName = history.unread;

			tmpcurrentListName.threads[index].isSelected = !isAllChecked;
			UPDATE_HISTORY({unread: tmpcurrentListName});
		});

		read.threads.map((el,index) => {
			const tmpcurrentListName = history.read;

			tmpcurrentListName.threads[index].isSelected = !isAllChecked;
			UPDATE_HISTORY({read: tmpcurrentListName});
		});

		this.resetCheckboxes();

	}

	resetCheckboxes()
	{
		const item = document.getElementsByClassName('bulk');
		let checked = [];

		UPDATE_HISTORY({isBulkCkeckboxMenuOpen: false});

		Object.values(item).map(el => {
			if(el.checked){
				checked.push(el)
			}
		});

		if(checked.length > 0){
			UPDATE_STATE({isSomeChecked: true,});
		} else if (checked.length === 0){
			UPDATE_STATE({isSomeChecked: false,});
		}

		checkSelectedList();
	}
}

class BulkLabelBlock extends Component
{
	constructor()
	{
		super(`div.set-label set-label-dropdown`);
	}

	setState({history})
	{
		const {tableLength, isBulkLabelOpen} = history;

		return super.setState({tableLength, isBulkLabelOpen})
	}

	_renderer()
	{
		const {tableLength, isBulkLabelOpen} = this.state;

		this.context.innerHTML = '';

		this.observe([
			make_component(`p`, {innerHTML: 'Label as:'}),
			make_component(`div`)
				.append(tableLength.map(
					table => {
						if(table.type === 'user'){
							return make_component(`div.label-action`, {
								onclick: e => {
									e.stopPropagation();
									e.preventDefault();
									const 	{selectedThreadList} = getState(),
											data = {
												threads: selectedThreadList,
												add: [table.label],
											};

									BULK_LABEL(data).then(
										() => {
											INFORM_USER('Labels is setted');
											CHANGE_VIEW(VIEW_HISTORY);
											resetCheckboxes()
										}
									);
								}
							})
							.observe([
								make_component('label.action')
									.observe([
										make_component('input.label-pick-input', {
											type: 'checkbox', 
											value: table.label,
											// checked: table.id === 
											onclick: e => {
												e.stopPropagation();
											}
										}),
										make_component('span.marked')					
									]),
								make_component(`span.label-value`, {
									innerText: table.label
								})
							]);
						}
					})
				),
			make_component('button.set-label-button', {
				innerText: 'Apply',
				onclick: () => {
					const items = document.getElementsByClassName('label-pick-input');
					let checkedOptions = [],
						uncheckedOptions = [];

					Object.values(items).map(el => {
						if(el.checked){
							checkedOptions.push(el.value);
						} else {
							uncheckedOptions.push(el.value);
						}
					});

					UPDATE_STATE({
						checkedOptionsStore: checkedOptions,
						uncheckedOptionsStore: uncheckedOptions
					});

					const 	{selectedThreadList, checkedOptionsStore, uncheckedOptionsStore} = getState(),
							data = {
								threads: selectedThreadList,
								add: checkedOptionsStore,
								remove: uncheckedOptionsStore
							};

					BULK_LABEL(data).then(
						() => {
							INFORM_USER('Labels is setted');
							CHANGE_VIEW(VIEW_HISTORY);
							resetCheckboxes()
						}
					);
				}
			})
		]);

		this.context.classList.toggle('active', isBulkLabelOpen)
	}
}

class BulkAddReminderBlock extends Component
{
	constructor()
	{
		super(`div.set-reminder set-reminder-dropdown`);
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
							const 	{history = {}, selectedThreadList, filters} = getState(),
									{emails = [], selectedEmail}				 = filters,
									currentEmail								 = emails[selectedEmail] || {},
									{reminderOption, reminderCondition, customDatetime, userTimezone} = history,
									data = {
										threads: selectedThreadList,
										reminderOption: reminderOption,
										reminderCondition: reminderCondition,
										customDatetime: customDatetime,
										userTimezone: userTimezone,
										email: currentEmail.name
									};

								BULK_CREATE_REMINDERS(data).then(
								() => {
									INFORM_USER('Reminders is created');
									CHANGE_VIEW(VIEW_HISTORY);
									resetCheckboxes()
								}
							);
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

	setState({history})
	{
		const {isBulkReminderOpen} = history;

		return super.setState({isBulkReminderOpen})
	}

	_renderer()
	{
		const {isBulkReminderOpen} = this.state;

		this.context.classList.toggle('active', isBulkReminderOpen)
	}

	destroy()
	{
		super.destroy();
		this.picker.destroy();
		this.picker = null;
		this.customDateTime = null;
	}
}
