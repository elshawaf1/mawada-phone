const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Reset Password</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#F7F8FA;display:flex;justify-content:center;align-items:center;min-height:100vh}
.card{background:#FFF;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}
h1{font-size:22px;color:#0F172A;margin-bottom:12px}
p{font-size:14px;color:#64748B;line-height:22px;margin-bottom:24px}
.btn{display:inline-block;background:#0F172A;color:#FFF;font-size:16px;font-weight:700;padding:14px 48px;border-radius:12px;border:none;cursor:pointer}
.msg{color:#94A3B8;font-size:13px;margin-top:16px}
.err{color:#E63946;font-size:13px;margin-top:16px}
a{color:#3B82F6}
</style>
</head>
<body>
<div class="card">
<h1>&#1605;&#1608;&#1583;&#1577; &#1601;&#1608;&#1606;</h1>
<p>&#1573;&#1593;&#1575;&#1583;&#1577; &#1578;&#1593;&#1610;&#1610;&#1606; &#1603;&#1604;&#1605;&#1577; &#1575;&#1604;&#1605;&#1585;&#1608;&#1585;</p>
<div id="app">
<button class="btn" id="openBtn">&#1601;&#1578;&#1581; &#1575;&#1604;&#1578;&#1591;&#1576;&#1610;&#1602;</button>
<p class="msg" id="status">&#1580;&#1575;&#1585;&#1610; &#1601;&#1578;&#1581; &#1575;&#1604;&#1578;&#1591;&#1576;&#1610;&#1602;...</p>
</div>
</div>
<script>
(function(){
var h=location.hash.substring(1)||location.search.substring(1);
var p=new URLSearchParams(h);
var at=p.get("access_token");
var rt=p.get("refresh_token");
if(at&&rt){
var dl="mawada://reset-password#access_token="+at+"&refresh_token="+rt;
document.getElementById("openBtn").onclick=function(){location.href=dl};
setTimeout(function(){location.href=dl},300);
setTimeout(function(){document.getElementById("status").innerHTML="&#1604;&#1605; &#1610;&#1601;&#1578;&#1581; &#1575;&#1604;&#1578;&#1591;&#1576;&#1610;&#1602;? <a href=\'"+dl+"\'>"+'&#1575;&#1590;&#1594;&#1591; &#1607;&#1606;&#1575;'</a>},4000);
}else{
document.getElementById("app").innerHTML="<p class=err>&#1585;&#1575;&#1576;&#1591; &#1594;&#1610;&#1585; &#1589;&#1575;&#1604;&#1581;</p>";
}
})();
</script>
</body>
</html>`;

Deno.serve((req) => {
  const origin = req.headers.get("origin") || "*";
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
});
