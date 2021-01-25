'use strict';

const Homey = require('homey');

class UnifiWifiClientDevice extends Homey.Device {

    // this method is called when the Device is inited
    onInit() {
        this.log('UnifiWifiClientDevice init');
        this.name = this.getName();
        this.log('name:', this.getName());
        this.log('store:', this.getStore());

        this.log('this.name:', this.name);

        this._online = this.getCapabilityValue('alarm_connected');
        this.state = {
            'name': '<pending>'
        };
    }

    _updateProperty(key, value) {
        let oldValue = this.getCapabilityValue(key);
        if (oldValue != value) {
            this.log(`[${this.name}] Updating capability ${key} from ${oldValue} to ${value}`);
            this.setCapabilityValue(key, value);

            let tokens = {
                rssi: this.state['rssi'],
                signal: this.state['signal'],
                radio_proto: this.state['radio_proto'],
                essid: this.state['essid']
            };
            if (key == 'alarm_connected') {
                let deviceTrigger = 'wifi_client_connected';
                let conditionTrigger = 'a_client_connected';
                if (value === false) {
                    deviceTrigger = 'wifi_client_disconnected';
                    conditionTrigger = 'a_client_disconnected';
                    tokens = {}
                }

                // Trigger wifi_client_(dis-)connected
                this.getDriver().triggerFlow(deviceTrigger, tokens, this);

                // Trigger a_client_(dis-)connected
                tokens = {
                    mac: this.getData().id,
                    name: this.getName(),
                    essid: this.state['essid']
                }
                this.getDriver().triggerFlow(conditionTrigger, tokens, this);
            }
            if (key == 'measure_signal') {
                // Let flow trigger be handled, and add tokens.
                this.getDriver().triggerFlow('wifi_client_signal_changed', tokens, this);
            }
        }
    }

    updateOnlineState(state) {
        let oldState = this.state;
        this._online = true;

        this.state = state;
        this._updateProperty('alarm_connected', true);
    }

    setOffline() {
        this._online = false;
        if (this.getCapabilityValue('alarm_connected') == false) return;

        this.log(`[${this.name}] Set device to offline`)
        this.state.ap_mac = null;
        this._updateProperty('alarm_connected', false);
    }

    isOnline() {
        return this._online;
    }

    triggerEvent(event, data) {
        // EVENT: wu.disconnected { _id: '5a7a08840866ea455bff4c1b',
        //   ap: 'de:ad:ba:be:ca:fe',
        //   bytes: 122541,
        //   datetime: '2018-02-06T19:56:30Z',
        //   duration: 334,
        //   hostname: 'android-randomstuff',
        //   key: 'EVT_WU_Disconnected',
        //   msg: 'User[de:ad:ca:fe:ba:be] disconnected from "MyWifi" (5m 34s connected, 119.67K bytes, last AP[de:ad:ba:be:ca:fe])',
        //   site_id: '123456789012345678901234',
        //   ssid: 'MyWifi',
        //   subsystem: 'wlan',
        //   time: 1517946990000,
        //   user: 'de:ad:ca:fe:ba:be' }
        if (event == 'wu.disconnected') return this.setOffline();
        if (event == 'wu.connected') {
            let state = this.state;
            return this.updateOnlineState(state);
        }
    }
}

module.exports = UnifiWifiClientDevice;