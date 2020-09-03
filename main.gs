var _ = Underscore.load();

var PROJECTS = [
  {name: 'project', webhook_url: 'https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYYYYYY/ZZZZZZZZZZZZZZZ'}
];

// GitLabユーザとSlackユーザの紐付け用
// slackIDが無いと正しくメッセージを送信できない場合があるため記述を推奨
var USER_NAME_LIST = [
  {gitlab: '@hoge', slack: '@hoge hoge'},
  {gitlab: '@fuga', slack: '@fuga', slackId: '@XXXXXXXXX'}
];

// WebhookからのPOSTを受け取りデータをパースする
function doPost(e) {
  var data = JSON.parse(e.postData.getDataAsString());
  
  // debug用
  // var debug_data = JSON.stringify(e.postData.getDataAsString());
  // callSlackWebhook('@fuga', debug_data);
  
  notifySlack(data);
}

// メッセージを整形してSlackにメッセージを送信する
function notifySlack(data) {

  // コメントがない場合は通知しない
  if (!data.object_attributes.note) {
    return;
  }
  
  // ユーザネームがマッチしない場合は通知しない
  var names = data.object_attributes.note.match(/@[a-zA-Z0-9_.\-]+/g);
  if (!names) {
    return;
  }
  
  for (var i in names) {
    // プロジェクト名からwebhookURLを取得
    var project = _.find(PROJECTS, function(project) {return project.name === data.project.name});
    var slack_webhook_url = project.webhook_url
  
    // issueとmerge requestでそれぞれ出力パターンを調整
    if (data.object_attributes.noteable_type == 'Issue') {
      var title = '【Issue】#' + data.issue.iid + ' ' + data.issue.title + "\n";
    } else if (data.object_attributes.noteable_type == 'MergeRequest') {
      var title = '【MergeRequest】!' + data.merge_request.iid + ' ' + data.merge_request.title + "\n";
    }
  
    // Attachmentメッセージを構築
    var message = [
      {
        fallback: 'Received comment from GitLab.',
        color: '#2eb886',
        pretext: 'Received comment from GitLab.',
        title: title,
        title_link: data.object_attributes.url,
        text: data.object_attributes.note,
        author_name: data.user.name,
        author_link: 'https://gitlab.com/' + data.user.username,
        author_icon: data.user.avatar_url,
        fields: [
          {
            title: 'Project',
            value: data.project.name,
            short: false
          }
        ],
        ts: Date.parse(data.object_attributes.created_at),
        footer: 'Send from GoogleAppsScript',
        footer_icon: 'path_to_icon',
      }
    ]
    
    callSlackWebhook(slack_webhook_url, convertUserName(names[i]), message);
  }
}

// GitLabユーザ名からSlackユーザ名を返却する
// slackIDがある場合はそちらを使用する
// 当てはまらない場合はGitLabユーザ名をそのまま返却する
function convertUserName(gitlabName) {
  var user = _.find(USER_NAME_LIST, function(user) {return user.gitlab === gitlabName});

  if (user) {
    var slackName = user.slackId || user.slack
    return slackName;
  }

  return gitlabName;
}

// メッセージをSlackのWebhookにPOSTする
function callSlackWebhook(url, user, message) {  
  var params = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      channel: user,
      attachments: message,
      link_names: 1,
    })
  };
  var response = UrlFetchApp.fetch(url, params);
  console.log("response:", response);
  return response;
}
