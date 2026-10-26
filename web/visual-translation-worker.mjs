import {inspectTranslatedScan} from '/src/visual-translation.mjs';

self.onmessage = ({data}) => {
  try {
    const result = inspectTranslatedScan(data.plan, data.samples, undefined,
      (completed, total) => self.postMessage({type: 'progress', completed, total}));
    self.postMessage({type: 'result', result});
  } catch (error) {
    self.postMessage({type: 'error', message: String(error.message || error)});
  }
};
