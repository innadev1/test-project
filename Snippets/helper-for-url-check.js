import {getState} from '../state';

export const updateUrl = () =>
{
	const 	{filters, history, view, isStandalone, 
			composePopup, compose} 							= getState(),
			{protocol, host, pathname} 	   			= window.location,
			{activeFolder, thread, search, 
			isThreadExpanded, lastOpenedMessage} 	= history,
			{showComposePopup, replyData}			= composePopup,
			{actionType}							= replyData,
			{draftId}								= compose,
			currentEmailNumber			   			= filters.selectedEmail,
			currentEmailName			   			= filters.emails[currentEmailNumber].name;

	if (!isStandalone) {
		return;
	}

	let selectedEmail = filters.selectedEmail ? currentEmailName : null,
		currentLabel = activeFolder.name || null,
		threadId = view === "threadList" && thread.id ? thread.id : null,
		threadExpanded = isThreadExpanded ? isThreadExpanded : null,
		openedComposer = (showComposePopup && !draftId && !actionType) ? showComposePopup : null,
		openedComposerDraft = draftId ? draftId : null,
		openedReply = actionType ? actionType : null,
		openedMessageId = lastOpenedMessage.id ? lastOpenedMessage.id : null,
		threadDraftId = view === "threadList" && thread.draftId ? thread.draftId : null,
		searchValue = search || null,
		newUrl = 	protocol 
					+ "//" 
					+ host 
					+ pathname 
					+ `?`
					+ (currentLabel ? `&currentLabel=${currentLabel}` : '')
					+ (selectedEmail ? `&selectedEmail=${selectedEmail}` : '')
					+ (threadId ? `&threadId=${threadId}` : '')
					+ (threadExpanded ? `&expandedThread=${threadExpanded}` : '')
					+ (openedComposer ? `&openedComposer=${openedComposer}` : '')
					+ (openedComposerDraft ? `&openedComposerDraft=${openedComposerDraft}` : '')
					+ (openedReply ? `&openedReply=${openedReply}` : '')
					+ (openedMessageId ? `&openedMessageId=${openedMessageId}` : '')
					+ (threadDraftId ? `&threadDraftId=${threadDraftId}` : '')
					+ (searchValue ? `&searchValue=${searchValue}` : '');

	window.history.pushState({ path: newUrl }, '', newUrl);
};

export const getParamUrl = (data) =>
{
	const 	strGET = window.location.search.replace( '?', ''),
			res = (new RegExp('[?&]'+encodeURIComponent(data)+'=([^&]*)')).exec(location.search);

	if (strGET.includes(data) && res) {
		return decodeURIComponent(res[1].split('?')[0]);
	}
};