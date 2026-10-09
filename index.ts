import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent вызывает AppRegistry.registerComponent('main', () => App),
// что корректно работает и в Expo Go, и в нативных сборках.
registerRootComponent(App);
