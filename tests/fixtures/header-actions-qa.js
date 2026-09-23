import {installLanguageUI} from '../../extension/i18n.js';
import {installPersonalSettingsMenu} from '../../extension/personal-settings-menu.js';
const page=new DOMParser().parseFromString(await (await fetch('/extension/options.html')).text(),'text/html');
document.querySelector('main').append(document.importNode(page.querySelector('header'),true));
document.querySelector('.brand-icon').src='/extension/icons/icon-128.png';
document.querySelector('#mode').textContent='自动运行已开启';document.querySelector('#mode').classList.add('on');
installPersonalSettingsMenu(document);const language=installLanguageUI(document);document.querySelector('#language').value='zh';language.apply();
