const Resource = require('./base');
const {showWorkflowLogsFromFirebase, showWorkflowLogsFromGCS} = require('./logs.helper');

class Logs extends Resource {
    // TODO : REFACTOR FIREBASE
    // TODO : FIX FIREBASE NOT CLOSED AFTER USAGE
    async showWorkflowLogs(workflowId, follow) {
        const workflow = await this.sdk.workflows.get({id: workflowId});
        const progressJob = await this.sdk.progress.get({id: workflow.progress});
        if (progressJob.location.type === 'firebase') {
            await showWorkflowLogsFromFirebase(progressJob._id, follow, this.sdk);
        } else {
            await showWorkflowLogsFromGCS(progressJob);
        }
    };
}

module.exports = Logs;
