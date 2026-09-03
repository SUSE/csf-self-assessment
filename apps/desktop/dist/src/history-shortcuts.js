export function decideDesktopHistoryCommand(input) {
    if (input.type !== 'keyDown' ||
        !input.meta ||
        input.control ||
        input.alt ||
        input.shift) {
        return { kind: 'ignore' };
    }
    if (input.key === '[') {
        return { kind: 'back' };
    }
    if (input.key === ']') {
        return { kind: 'forward' };
    }
    return { kind: 'ignore' };
}
export function installDesktopHistoryShortcuts(contents) {
    contents.on('before-input-event', (event, input) => {
        const type = input.type;
        if (type !== 'keyDown' && type !== 'keyUp' && type !== 'char') {
            return;
        }
        const command = decideDesktopHistoryCommand({
            type,
            key: input.key,
            meta: input.meta,
            control: input.control,
            alt: input.alt,
            shift: input.shift,
        });
        if (command.kind === 'ignore') {
            return;
        }
        event.preventDefault();
        if (command.kind === 'back') {
            if (contents.navigationHistory.canGoBack()) {
                contents.navigationHistory.goBack();
            }
            return;
        }
        if (contents.navigationHistory.canGoForward()) {
            contents.navigationHistory.goForward();
        }
    });
}
