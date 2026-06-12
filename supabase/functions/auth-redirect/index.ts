import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>مودة فون - إعادة تعيين كلمة المرور</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F7F8FA;display:flex;justify-content:center;align-items:center;min-height:100vh}
    .card{background:#FFF;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}
    h1{font-size:22px;color:#0F172A;margin-bottom:12px}
    p{font-size:14px;color:#64748B;line-height:22px;margin-bottom:24px}
    .btn{display:inline-block;background:#0F172A;color:#FFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:12px;cursor:pointer;border:none}
    .btn:active{opacity:.8}
    .msg{color:#94A3B8;font-size:13px;margin-top:16px}
    .err{color:#E63946;font-size:13px;margin-top:16px}
  </style>
</head>
<body>
  <div class="card">
    <h1>مودة فون</h1>
    <p>إعادة تعيين كلمة المرور</p>
    <div id="app">
      <button class="btn" id="openBtn">فتح التطبيق</button>
      <p class="msg" id="status">جاري فتح التطبيق...</p>
    </div>
  </div>
  <script>
    (function(){
      var h=location.hash.substring(1)||location.search.substring(1);
      var p=new URLSearchParams(h);
      var at=p.get('access_token');
      var rt=p.get('refresh_token');
      if(at&&rt){
        var dl='mawada://reset-password#access_token='+at+'&refresh_token='+rt;
        document.getElementById('openBtn').onclick=function(){location.href=dl};
        setTimeout(function(){location.href=dl},300);
        setTimeout(function(){document.getElementById('status').innerHTML='لم يفتح التطبيق؟ <a href="'+dl+'" style="color:#3B82F6">اضغط هنا</a>'},4000);
      }else{
        document.getElementById('app').innerHTML='<p class="err">رابط غير صالح أو منتهي الصلاحية<br/>يرجى طلب رابط جديد</p>';
      }
    })();
  </script>
</body>
</html>`;

Deno.serve(() => {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
});
