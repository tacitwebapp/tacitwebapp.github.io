import { joinRoom } from 'https://esm.sh/trystero@0.26.0/nostr';

window.TacitSync = {
    connect(app, channel) {
        if (app.connections[channel]) return;
        const config = { appId: app.appId };
        if (app.settings.relays.trim()) {
            config.relayConfig = { urls: app.settings.relays.split(',').map(relay => relay.trim()).filter(Boolean) };
        }
        const room = joinRoom(config, channel);
        const syncAction = room.makeAction('syncTacit');
        syncAction.onMessage = (data, peerId) => app.receiveFromPeer(data, channel, peerId);
        room.onPeerJoin = peerId => {
            app.logSync(`Peer ${peerId.substring(0, 6)} joined ${channel}.`);
            if (app.tacitData.length) syncAction.send(app.tacitData.map(entry => entry.data), peerId);
        };
        room.onPeerLeave = peerId => app.logSync(`Peer ${peerId.substring(0, 6)} left ${channel}.`);
        app.connections[channel] = { room, syncAction };
        app.logSync(`Connected to channel: ${channel}`);
    },
    broadcast(app, records) {
        Object.values(app.connections).forEach(({ syncAction }) => syncAction.send(records));
    }
};
