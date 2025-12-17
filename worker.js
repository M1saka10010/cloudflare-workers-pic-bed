export default {
	async fetch(request, env, ctx) {
		try {
			return await handleRequest(request, env);
		} catch (err) {
			return new Response(err.stack, { status: 500 });
		}
	},
};

const login_html = `
<!DOCTYPE html>
<html>

<head>
    <title>登录</title>
    <link rel="stylesheet" href="https://cdn.fzf404.art/sedom/dist/sedom.css">
</head>

<body>
    <form id="login-form">
        <label for="password">密码：</label>
        <input type="password" id="password" name="password" required><br><br>
        <input type="submit" value="登录">
    </form>

    <script async src="https://cdn.fzf404.art/sedom/dist/sedom.js"></script>
    <script>
        // 封装异步请求函数
        async function fetchJson(url, method, body) {
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                if (!response.ok) {
                    throw new Error(\`HTTP error! Status: \${response.status}\`);
                }
                return response.json();
            } catch (error) {
                console.error(error);
                return null;
            }
        }

        // 封装处理登录逻辑的函数
        async function handleLogin(e) {
            e.preventDefault();
            const password = document.getElementById("password").value;
            const response = await fetchJson("/login", "POST", { passwd: password });
            if (response && response.status === 200) {
                localStorage.setItem("token", response.token);
                window.location.href = "/admin";
            } else {
                alert(response ? response.message : "登录失败");
            }
        }

        // 封装验证本地token的函数
        async function checkLocalToken() {
            const localToken = localStorage.getItem("token");
            if (localToken) {
                const response = await fetchJson("/check", "POST", { token: localToken });
                if (response && response.status === 200) {
                    window.location.href = "/admin";
                }
            }
        }

        // 添加事件监听器
        document.getElementById("login-form").addEventListener("submit", handleLogin);

        // 在页面加载时检查本地token
        window.addEventListener("load", checkLocalToken);
    </script>
</body>

</html>
`;

const admin_html = `
<!DOCTYPE html>
<html>

<head>
    <title>后台</title>
    <link rel="stylesheet" href="https://cdn.fzf404.art/sedom/dist/sedom.css">
</head>

<body>
    <h2>后台管理</h2>
    <!-- 列表 上传 和退出三个按钮并排 -->
    <button onclick="window.location.href='/list'">列表</button>
    <button onclick="window.location.href='/upload'">上传</button>
    <button onclick="logout()">退出</button>
    <script src="https://cdn.fzf404.art/sedom/dist/sedom.js"></script>
    <script>
        let localToken = localStorage.getItem("token");
        // post验证本地token是否有效
        if (localToken) {
            let response = fetch("/check", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: localToken
                })
            }).then(res => res.json()).then(res => {
                if (res.status != 200) {
                    window.location.href = "/login";
                }
            });
        } else {
          window.location.href = "/login";
        }
        function logout() {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
    </script>
</body>

</html>
`;

const list_html = `
<!DOCTYPE html>
<html>

<head>
    <title>列表-后台管理</title>
    <link rel="stylesheet" href="https://cdn.fzf404.art/sedom/dist/sedom.css">
</head>

<body>
    <h2>图片列表</h2>
    <button onclick="window.location.href='/admin'">返回</button>
    <hr>
    <table>
        <thead>
            <tr>
                <th>图片</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="list">
        </tbody>
    </table>
    <div id="pagination">
        <button onclick="prevPage()">上一页</button>
        <span id="pageInfo"></span>
        <button onclick="nextPage()">下一页</button>
    </div>
    <script src="https://cdn.fzf404.art/sedom/dist/sedom.js"></script>
    <script>
        let localToken = localStorage.getItem("token");
        // post验证本地token是否有效
        if (localToken) {
            let response = fetch("/check", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: localToken
                })
            }).then(res => res.json()).then(res => {
                if (res.status != 200) {
                    window.location.href = "/login";
                }
            });
        } else {
          window.location.href = "/login";
        }
        // 初始化当前页码和每页显示的图片数量
        let currentPage = 1;
        const imagesPerPage = 10;
        let result; // 声明result变量

        // 等待DOM加载完成
        document.addEventListener('DOMContentLoaded', async () => {

            // 获取图片列表
            try {
                const response = await fetch("/list", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        passwd: localToken
                    })
                });
                result = await response.json(); // 将result赋值
                if (result.status === 200) {
                    const list = document.getElementById("list");
                    // 计算当前页应显示的图片范围
                    const startIndex = (currentPage - 1) * imagesPerPage;
                    const endIndex = startIndex + imagesPerPage;
                    const displayedImages = result.data.slice(startIndex, endIndex);
                    for (let i = 0; i < displayedImages.length; i++) {
                        const imgSrc = displayedImages[i];
                        const tr = document.createElement("tr");
                        tr.innerHTML = \`
                            <td><img src="\${imgSrc}" style="height: 100px;"></td>
                            <td><button class="delete-button" onclick="deleteImg('\${imgSrc}')">删除</button></td>
                        \`;
                        list.appendChild(tr);
                    }
                    updatePageInfo(); // 更新页码信息
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Error fetching image list:", error);
            }

        });

        // 上一页按钮点击事件处理
        function prevPage() {
            if (currentPage > 1) {
                currentPage--;
                refreshImageList();
            }
        }

        // 下一页按钮点击事件处理
        function nextPage() {
            if (result) { // 确保result已定义
                const totalImages = result.data.length;
                const totalPages = Math.ceil(totalImages / imagesPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    refreshImageList();
                }
            }
        }

        // 更新图片列表
        function refreshImageList() {
            // 清空当前列表
            const list = document.getElementById("list");
            list.innerHTML = "";
            // 计算当前页应显示的图片范围
            const startIndex = (currentPage - 1) * imagesPerPage;
            const endIndex = startIndex + imagesPerPage;
            const displayedImages = result.data.slice(startIndex, endIndex);
            for (let i = 0; i < displayedImages.length; i++) {
                const imgSrc = displayedImages[i];
                const tr = document.createElement("tr");
                tr.innerHTML = \`
                    <td><img src="\${imgSrc}" style="height: 100px;"></td>
                    <td><button class="delete-button" onclick="deleteImg('\${imgSrc}')">删除</button></td>
                \`;
                list.appendChild(tr);
            }
            updatePageInfo(); // 更新页码信息
        }

        // 更新页码信息
        function updatePageInfo() {
            if (result) { // 确保result已定义
                const totalImages = result.data.length;
                const totalPages = Math.ceil(totalImages / imagesPerPage);
                const pageInfo = document.getElementById("pageInfo");
                pageInfo.textContent = \`第 \${currentPage} 页 / 共 \${totalPages} 页\`;
            }
        }
        function deleteImg(id) {
            fetch("/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    passwd: localToken,
                    id: id
                })
            }).then(res => res.json()).then(res => {
                if (res.status === 200) {
                    alert("删除成功");
                    window.location.reload();
                } else {
                    alert(res.message);
                }
            }).catch(err => {
                console.error(err);
            });
        }
    </script>
</body>

</html>
`;

const upload_html = `
<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <title>上传图片</title>
  <link rel="stylesheet" href="https://cdn.fzf404.art/sedom/dist/sedom.css">
  <style>
    #drop-area {
      border: 2px dashed #ccc;
      width: 40vw;
      height: 30vh;
      line-height: 30vh;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 20px;
      color: #999;
    }

    #drop-area.dragover {
      border-color: #000;
      color: #000;
    }
  </style>
</head>

<body>
  <h2>上传图片</h2>
  <button onclick="window.location.href='/admin'">返回</button>
  <div id="drop-area">
    拖放图片到这里或
    <input type="file" id="file-input" style="display: none;" />
    <label for="file-input" style="cursor: pointer;">选择图片</label>
  </div>
  <div id="result" style="display: none;">
    <h2>图片直链</h2>
    <div id="links">
      <input type="text" id="link-input" readonly />
      <button id="copy-btn">复制</button>
      <button id="reset-btn">重置</button>
    </div>
  </div>
</body>

<script src="https://cdn.fzf404.art/sedom/dist/sedom.js"></script>
<script>
  (function () {
    const localToken = localStorage.getItem("token");
    if (localToken) {
      fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: localToken
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.status !== 200) {
            window.location.href = "/login";
          }
        });
    } else {
      window.location.href = "/login";
    }

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    function handleFileDrop(e) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    }

    function handleFileSelect(e) {
      const files = e.target.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    }

    function handleFiles(files) {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        const imgData = e.target.result;
        submitImageData(imgData);
      };

      reader.readAsDataURL(file);
    }

    async function submitImageData(imgData) {
      const url = '/upload';
      const data = {
        image: imgData,
        passwd: localToken
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const res = await response.json();
        if (res.status === 200) {
          const linkInput = document.getElementById('link-input');
          linkInput.value = \`\${window.location.protocol}//\${window.location.hostname}/\${res.path}\`;
          const resultDiv = document.getElementById('result');
          resultDiv.style.display = 'block';
        } else {
          alert(res.message);
        }
      } catch (error) {
        console.error('请求出错:', error);
      }
    }

    const dropArea = document.getElementById('drop-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('dragover');
      }, false);
    });

    dropArea.addEventListener('drop', handleFileDrop, false);
    const fileInput = document.querySelector('input[type="file"]');
    fileInput.addEventListener('change', handleFileSelect, false);

    document.getElementById('reset-btn').addEventListener('click', () => {
      const linkInput = document.getElementById('link-input');
      linkInput.value = '';
      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'none';
      fileInput.value = ''; // 清空选择的文件
    });
  })();
</script>

</html>
`;

function b64toBlob(b64Data, contentType = null, sliceSize = null) {
	contentType = contentType || "image/png";
	sliceSize = sliceSize || 512;
	let byteCharacters = atob(b64Data);
	let byteArrays = [];
	for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		let slice = byteCharacters.slice(offset, offset + sliceSize);
		let byteNumbers = new Array(slice.length);
		for (let i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}
		var byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}
	return new Blob(byteArrays, { type: contentType });
}

async function readRequestBody(request) {
	const { headers } = request;
	const contentType = headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return JSON.stringify(await request.json());
	} else if (contentType.includes("application/text")) {
		return request.text();
	} else if (contentType.includes("text/html")) {
		return request.text();
	} else if (contentType.includes("form")) {
		const formData = await request.formData();
		const body = {};
		for (const entry of formData.entries()) {
			body[entry[0]] = entry[1];
		}
		return JSON.stringify(body);
	} else {
		return 0;
	}
}

async function md5Gen(str) {
	// 将输入的字符串转换为 Uint8Array
	const encoder = new TextEncoder();
	const data = encoder.encode(str);

	// 使用 subtle.digest 方法计算 MD5
	const hashBuffer = await crypto.subtle.digest("MD5", data);

	// 将 ArrayBuffer 转换为 Uint8Array
	const hashArray = Array.from(new Uint8Array(hashBuffer));

	// 将 Uint8Array 转换为十六进制字符串
	const hashHex = hashArray
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

	return hashHex;
}

async function handleRequest(request, env) {
	const passwd = env.password;
	let url = new URL(request.url);
	if (request.method === "GET") {
		let id = url.pathname.substring(1);
		if (!id) {
			return new Response("Misaka's image backend", { status: 200 });
		}
		let html_init = {
			headers: {
				"content-type": "text/html; charset=utf-8",
			},
		};
		switch (id) {
			case "login":
				return new Response(login_html, html_init);
			case "admin":
				return new Response(admin_html, html_init);
			case "list":
				return new Response(list_html, html_init);
			case "upload":
				return new Response(upload_html, html_init);
		}

		let b64 = await env.data.get(id);
		if (!b64) {
			return new Response("Image Not Found", { status: 404 });
		}
		let reg = /(?<=data:)(.*?)(?=;base64,)/g;
		let type = b64.match(reg);
		if (!type) {
			return new Response("Image Error", { status: 500 });
		}
		let init = {
			headers: {
				"content-type": type,
				"content-disposition": "inline",
			},
		};
		let img = b64toBlob(b64.split(",")[1], type);
		return new Response(img, init);
	} else if (request.method === "POST") {
		let init = {
			headers: {
				"content-type": "application/json",
			},
		};
		let type = url.pathname.substring(1);
		if (!type) {
			let res = JSON.stringify({
				status: 400,
				message: "Request Type Not Found",
			});
			return new Response(res, init);
		}
		if (type == "login") {
			let json = await readRequestBody(request);
			if (!json) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			json = JSON.parse(json);
			if (!json) {
				let res = JSON.stringify({ status: 500, message: "Json Error" });
				return new Response(res, init);
			}
			if (!json.passwd) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			if (json.passwd != passwd) {
				let res = JSON.stringify({ status: 403, message: "Password Error" });
				return new Response(res, init);
			}
			let res = JSON.stringify({
				status: 200,
				message: "Login Success",
				token: await md5Gen(passwd),
			});
			return new Response(res, init);
		}
		if (type == "check") {
			let json = await readRequestBody(request);
			if (!json) {
				let res = JSON.stringify({ status: 400, message: "Need Token" });
				return new Response(res, init);
			}
			json = JSON.parse(json);
			if (!json) {
				let res = JSON.stringify({ status: 500, message: "Json Error" });
				return new Response(res, init);
			}
			if (!json.token) {
				let res = JSON.stringify({ status: 400, message: "Need Token" });
				return new Response(res, init);
			}
			if (json.token != (await md5Gen(passwd))) {
				let res = JSON.stringify({ status: 403, message: "Token Error" });
				return new Response(res, init);
			}
			let res = JSON.stringify({
				status: 200,
				message: "Token Correct",
			});
			return new Response(res, init);
		}
		if (type == "list") {
			let json = await readRequestBody(request);
			if (!json) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			json = JSON.parse(json);
			if (!json) {
				let res = JSON.stringify({ status: 500, message: "Json Error" });
				return new Response(res, init);
			}
			if (!json.passwd) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			if (json.passwd != (await md5Gen(passwd))) {
				let res = JSON.stringify({ status: 403, message: "Password Error" });
				return new Response(res, init);
			}

			let ids = await env.data.list();
			let list = [];
			for (let i = 0; i < ids.keys.length; i++) {
				list.push(ids.keys[i].name);
			}
			let res = JSON.stringify({
				status: 200,
				message: "List Success",
				data: list,
			});
			return new Response(res, init);
		}
		if (type == "upload") {
			let json = await readRequestBody(request);
			if (!json) {
				let res = JSON.stringify({ status: 400, message: "Need Image" });
				return new Response(res, init);
			}
			json = JSON.parse(json);
			if (!json) {
				let res = JSON.stringify({ status: 500, message: "Json Error" });
				return new Response(res, init);
			}
			if (!json.passwd) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			if (json.passwd != (await md5Gen(passwd))) {
				let res = JSON.stringify({ status: 403, message: "Password Error" });
				return new Response(res, init);
			}
			// 判断是否为base64图片
			let reg = /^data:image\/(png|jpg|jpeg|gif|x-icon);base64,/;
			if (!reg.test(json.image)) {
				let res = JSON.stringify({ status: 400, message: "Need Base64 Image" });
				return new Response(res, init);
			}
			// 图片大小限制
			if (json.image.length > 1024 * 1024 * 5) {
				let res = JSON.stringify({ status: 400, message: "Image Too Large" });
				return new Response(res, init);
			}
			// 计算图片MD5
			let md5 = await md5Gen(json.image);
			// 查询是否已经存在

			let img = await env.data.get(md5);
			if (img) {
				let res = JSON.stringify({
					status: 200,
					message: "Image Already Exists",
					path: md5,
				});
				return new Response(res, init);
			}
			// 保存图片

			await env.data.put(md5, json.image);
			let res = JSON.stringify({
				status: 200,
				message: "Upload Success",
				path: md5,
			});
			return new Response(res, init);
		}
		if (type == "delete") {
			let json = await readRequestBody(request);
			if (!json) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			json = JSON.parse(json);
			if (!json) {
				let res = JSON.stringify({ status: 500, message: "Json Error" });
				return new Response(res, init);
			}
			if (!json.passwd) {
				let res = JSON.stringify({ status: 400, message: "Need Password" });
				return new Response(res, init);
			}
			if (json.passwd != (await md5Gen(passwd))) {
				let res = JSON.stringify({ status: 403, message: "Password Error" });
				return new Response(res, init);
			}
			if (!json.id) {
				let res = JSON.stringify({ status: 400, message: "Need Image ID" });
				return new Response(res, init);
			}

			let img = await env.data.get(json.id);
			if (!img) {
				let res = JSON.stringify({ status: 404, message: "Image Not Found" });
				return new Response(res, init);
			}

			await env.data.delete(json.id);
			let res = JSON.stringify({ status: 200, message: "Delete Success" });
			return new Response(res, init);
		}
		let res = JSON.stringify({
			status: 400,
			message: "Request Type Not Found",
		});
		return new Response(res, init);
	}
}
