"""Regression checks against a private JSON fixture and headless Chrome."""

import base64
from datetime import datetime, timezone
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time

from playwright.sync_api import expect, sync_playwright


def freshman_flow(browser, origin, root):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    try:
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(origin)
        page.wait_for_load_state("networkidle")
        expect(page.locator(".hero h1")).to_contain_text("从你的兴趣开始")
        expect(page.locator(".department-card")).to_have_count(4)
        expect(page.locator("[data-studio-project]")).to_contain_text("卓软招新系统")
        page.get_by_role("link", name="作品展示", exact=True).click()
        expect(page.locator("#works-title")).to_be_focused()
        page.get_by_role("button", name="体验报名页面", exact=False).click()
        expect(page.locator(".application-form")).to_be_visible()
        page.locator(".nav a[href='#home']").click()
        page.get_by_role("link", name="部门方向", exact=True).click()
        expect(page.locator("#departments-title")).to_be_focused()
        page.get_by_role("button", name="认识数据算法部", exact=False).click()
        expect(page.locator("[data-department-guide]")).to_contain_text("选一门语言")
        expect(page.locator("[data-department-guide]")).to_contain_text("不是额外考题或录取条件")
        page.get_by_role("button", name="选择该部门并报名").click()
        expect(page.locator("select[name=preferredDepartment]")).to_have_value("数据算法部")
        page.locator(".nav a[href='#home']").click()
        page.locator(".faq-list summary").first.click()
        expect(page.locator(".faq-list details").first).to_have_attribute("open", "")
        for width, height in [(320, 844), (375, 844), (844, 390), (768, 1024), (1440, 1000)]:
            page.set_viewport_size({"width": width, "height": height})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"homepage overflow {width}px"
        output = root / ".verification"
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=str(output / "freshman-home-desktop.png"), full_page=True)
        page.screenshot(path=str(output / "studio-home-desktop-viewport.png"))
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=str(output / "freshman-home-mobile.png"), full_page=True)
        page.screenshot(path=str(output / "studio-home-mobile-viewport.png"))
        page.locator(".department-card button").filter(has_text="实干青年部").click()
        expect(page.locator("#page-title")).to_have_text("实干青年部")
        profiles = json.loads(subprocess.check_output(["node", "-e", "process.stdout.write(JSON.stringify(require('./src/recruitment.cjs').DEPARTMENT_PROFILES))"], cwd=root, text=True, encoding="utf-8"))
        for profile in profiles:
            page.get_by_role("button", name=profile["name"], exact=True).click()
            expect(page.locator("[data-department-positioning]")).to_contain_text(profile["summary"])
            duties = page.locator("[data-department-responsibilities] article")
            expect(duties).to_have_count(3)
            for index, duty in enumerate(profile["responsibilities"]):
                expect(duties.nth(index).locator("h3")).to_have_text(duty["title"])
                expect(duties.nth(index).locator("p")).to_have_text(duty["description"])
            for width, height in [(320, 844), (768, 1024), (1440, 1000)]:
                page.set_viewport_size({"width": width, "height": height})
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"department overflow {profile['name']} {width}px"
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(output / f"department-{profile['name']}-desktop.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            page.screenshot(path=str(output / f"department-{profile['name']}-mobile.png"), full_page=True)
        page.get_by_role("button", name="实干青年部", exact=True).click()
        expect(page.get_by_role("button", name="选择该部门并报名")).to_have_count(0)
        page.get_by_role("button", name="数据算法部", exact=True).click()
        page.get_by_role("button", name="选择该部门并报名").click()
        expect(page.locator("select[name=preferredDepartment]")).to_have_value("数据算法部")
        expect(page.locator("[data-freshman-journey] [aria-current=step]")).to_contain_text("填写报名")
        expect(page.locator("#page-title")).to_be_focused()
        expect(page).to_have_title("填写报名表 · 卓软信息工作室")
        assert page.locator("select[name=college] option").all_text_contents() == [
            "请选择", "人工智能与软件学院", "电气与智能制造学院", "经济学院", "管理学院", "文理学院", "传媒与设计学院",
        ]
        page.screenshot(path=str(output / "freshman-registration-mobile.png"), full_page=True)
        fields = {
            "name": "新生流程测试", "birthDate": "2007-03", "ethnicity": "汉族",
            "departmentMajor": "软件工程系", "className": "26 软件工程 1 班",
            "studentId": "202699999999", "phone": "13999999999", "qq": "909090909",
        }
        for key, value in fields.items():
            page.locator(f".application-form input[name={key}]").fill(value)
        for key, value in {"gender": "男", "politicalStatus": "共青团员", "college": "人工智能与软件学院", "acceptAdjustment": "是"}.items():
            page.locator(f".application-form select[name={key}]").select_option(value)
        for key, value in {"strengths": "喜欢网页开发，想学编程", "careerPlan": "希望学习网页开发并参与项目"}.items():
            page.locator(f"textarea[name={key}]").fill(value)
        page.locator("input[name=photoData]").set_input_files({
            "name": "freshman.png", "mimeType": "image/png",
            "buffer": base64.b64decode(page.evaluate("(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; return canvas.toDataURL('image/png').split(',')[1]; })()")),
        })
        expect(page.locator(".form-side-panel h2")).to_have_text("100%")
        page.wait_for_function("() => JSON.parse(localStorage.getItem('zhuoruan_recruitment_form_draft') || '{}').data?.studentId === '202699999999'")
        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.locator("input[name=name]")).to_have_value(fields["name"])
        expect(page.locator(".draft-restored")).to_contain_text("已恢复")
        writes = []
        page.on("request", lambda request: writes.append(request.url) if request.method == "POST" and request.url == origin + "/api/applications" else None)
        page.locator(".application-form button[type=submit]").click()
        expect(page.locator("[data-application-review]")).to_be_visible()
        assert writes == [], "review must not submit a record"
        expect(page.locator(".review-facts")).to_contain_text(fields["studentId"])
        expect(page.locator(".review-facts")).to_contain_text(fields["phone"])
        page.screenshot(path=str(output / "freshman-review-mobile.png"), full_page=True)
        page.route("**/api/applications", lambda route: route.fulfill(status=503, json={"message": "测试网络繁忙，请重试。"}))
        page.locator("[data-confirm-application]").click()
        expect(page.locator("[data-application-review] [role=alert]")).to_contain_text("请重试")
        assert page.evaluate("!!localStorage.getItem('zhuoruan_recruitment_form_draft')")
        page.unroute("**/api/applications")
        lost_receipts = []
        def lose_receipt(route):
            response = route.fetch()
            assert response.status == 201
            lost_receipts.append(response.json()["record"])
            route.abort("failed")
        page.route("**/api/applications", lose_receipt)
        page.locator("[data-confirm-application]").click()
        expect(page.locator("[data-application-review] [role=alert]")).to_contain_text("请稍后重试")
        assert len(lost_receipts) == 1
        saved_key = page.evaluate("JSON.parse(localStorage.getItem('zhuoruan_recruitment_form_draft')).submissionKey")
        page.unroute("**/api/applications")
        page.reload()
        page.wait_for_load_state("networkidle")
        assert page.evaluate("JSON.parse(localStorage.getItem('zhuoruan_recruitment_form_draft')).submissionKey") == saved_key
        page.locator(".application-form button[type=submit]").click()
        page.locator("[data-confirm-application]").click()
        expect(page.locator("[data-status-guidance]")).to_contain_text("等待部门审核")
        expect(page.locator("[data-recruitment-receipt]")).to_contain_text(fields["name"])
        code = page.locator("[data-recruitment-receipt] .submit-id").inner_text()
        assert code == fields["phone"]
        assert code == lost_receipts[0]["phone"], "retry restores the original receipt after reload"
        assert page.evaluate("localStorage.getItem('zhuoruan_recruitment_form_draft')") is None
        with page.expect_download() as downloading:
            page.locator("[data-download-receipt]").click()
        receipt_file = output / "freshman-receipt-test.txt"
        downloading.value.save_as(receipt_file)
        text = receipt_file.read_text(encoding="utf-8-sig")
        assert code in text and fields["studentId"] in text
        assert fields["phone"] in text and fields["qq"] not in text
        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-recruitment-receipt]")).to_contain_text(fields["name"])
        expect(page.locator("[data-status-lookup] input[name=studentId]")).to_have_value(fields["studentId"])
        expect(page.locator("[data-status-lookup] input[name=phone]")).to_have_value(code)
        page.locator("[data-status-lookup] button[type=submit]").click()
        expect(page.locator("[data-status-guidance]")).to_contain_text("等待部门审核")
        expect(page.locator("[data-status-guidance]")).not_to_contain_text("请先完成基础题")
        expect(page.locator("[data-quiz-pending]")).to_have_count(0)
        page.screenshot(path=str(output / "freshman-status-mobile.png"), full_page=True)
        page.emulate_media(reduced_motion="reduce")
        context.set_offline(True)
        expect(page.locator(".network-notice")).to_be_visible()
        page.locator(".nav a[href='#register']").click()
        expect(page.locator(".application-form button[type=submit]")).to_be_disabled()
        context.set_offline(False)
        expect(page.locator(".network-notice")).to_have_count(0)
        assert not errors, errors
        restricted = context.new_page()
        restricted.add_init_script("Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Blocked', 'SecurityError'); }}); Object.defineProperty(window, 'sessionStorage', {get() { throw new DOMException('Blocked', 'SecurityError'); }});")
        restricted.on("pageerror", lambda error: errors.append(str(error)))
        restricted.goto(origin + "/#register")
        restricted.wait_for_load_state("networkidle")
        expect(restricted.locator(".application-form button[type=submit]")).to_be_enabled()
        restricted.locator("input[name=name]").fill("存储受限测试")
        expect(restricted.locator(".draft-status")).to_contain_text("无法保存草稿")
        assert not errors, errors
        restricted.close()
        print("PASS freshman: homepage/FAQ, department choice, restored draft, review-before-write, retry, real signup, receipt download, receipt recovery, prefilled lookup and offline feedback")
    finally:
        context.close()


def parallax_flow(browser, origin, root):
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    exceptions = []
    try:
        page = context.new_page()
        page.on("pageerror", lambda error: exceptions.append(str(error)))
        page.goto(origin)
        page.wait_for_load_state("networkidle")
        hero = page.locator(".studio-hero")
        expect(hero).to_have_class(re.compile(r"has-depth-motion"))
        button = page.get_by_role("button", name="加入卓软", exact=False)
        original_button = button.bounding_box()
        page.mouse.move(100, 200)
        page.wait_for_function("() => Number(document.querySelector('.studio-hero').style.getPropertyValue('--hero-x')) < -0.7")
        left = page.locator(".studio-workspace").evaluate("el => getComputedStyle(el).transform")
        page.screenshot(path=str(root / ".verification/parallax-left.png"))
        page.mouse.move(1320, 780)
        page.wait_for_function("() => Number(document.querySelector('.studio-hero').style.getPropertyValue('--hero-x')) > 0.7")
        right = page.locator(".studio-workspace").evaluate("el => getComputedStyle(el).transform")
        assert left != right and "matrix3d" in right
        assert page.locator(".workspace-room").evaluate("el => getComputedStyle(el).transform") != page.locator(".workspace-foreground").evaluate("el => getComputedStyle(el).transform")
        moved_button = button.bounding_box()
        assert all(abs(original_button[key] - moved_button[key]) < 1 for key in ("x", "y", "width", "height")), "primary action must not move"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=str(root / ".verification/parallax-right.png"))
        page.mouse.move(10, 10)
        page.wait_for_function("() => document.querySelector('.studio-hero').style.getPropertyValue('--hero-x') === '0.0000' && !document.querySelector('.studio-hero').classList.contains('is-depth-moving')")
        page.mouse.move(1280, 700)
        page.wait_for_function("() => Number(document.querySelector('.studio-hero').style.getPropertyValue('--hero-x')) > 0.5")
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_function("() => !document.querySelector('.studio-hero').classList.contains('has-depth-motion')")
        assert page.locator(".studio-workspace").evaluate("el => getComputedStyle(el).transform") == "none"
        assert hero.evaluate("el => Number(el.style.getPropertyValue('--hero-x'))") == 0
        page.emulate_media(reduced_motion="no-preference")
        expect(hero).to_have_class(re.compile(r"has-depth-motion"))
        page.mouse.move(110, 250)
        page.wait_for_function("() => Number(document.querySelector('.studio-hero').style.getPropertyValue('--hero-x')) < -0.5")
        page.evaluate("window.scrollTo(0, 150)")
        page.wait_for_function("() => document.querySelector('.studio-hero').style.getPropertyValue('--hero-x') === '0.0000'")
        page.evaluate("window.scrollTo(0, 0)")
        button.click()
        expect(page.locator(".application-form")).to_be_visible()
        page.get_by_role("link", name="了解卓软", exact=True).click()
        page.mouse.move(1300, 700)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_function("() => !document.querySelector('.studio-hero').classList.contains('has-depth-motion')")
        assert page.locator(".studio-workspace").evaluate("el => getComputedStyle(el).transform") == "none"
        assert not exceptions, exceptions
    finally:
        context.close()
    touch = browser.new_context(viewport={"width": 1024, "height": 768}, has_touch=True, is_mobile=True)
    try:
        page = touch.new_page()
        page.goto(origin)
        page.wait_for_load_state("networkidle")
        assert "has-depth-motion" not in page.locator(".studio-hero").get_attribute("class")
        page.get_by_role("button", name="加入卓软", exact=False).tap()
        expect(page.locator(".application-form")).to_be_visible()
    finally:
        touch.close()
    print("PASS parallax: mouse-driven 3D layers, stationary signup button, reset and frame settling, live reduced-motion preference, scroll, navigation teardown, narrow screens and touch-only devices")


def main():
    root = Path(__file__).resolve().parent.parent
    server = subprocess.Popen(
        ["node", "tests/frontend_fixture.cjs"],
        cwd=root,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        line = server.stdout.readline()
        if not line:
            raise RuntimeError(server.stderr.read())
        origin = f"http://127.0.0.1:{json.loads(line)['port']}"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, channel="chrome")
            try:
                page = browser.new_page(viewport={"width": 390, "height": 844})
                exceptions = []
                page.on("pageerror", lambda error: exceptions.append(str(error)))
                page.goto(origin + "/#register")
                page.wait_for_load_state("networkidle")
                page.locator(".application-form button[type=submit]").click()
                expect(page.locator(".error-summary")).to_be_visible()
                page.locator(".error-summary a").first.click()
                expect(page).to_have_url(origin + "/#register")
                expect(page.locator("input[name=name]")).to_be_focused()
                assert page.locator("#field-name").bounding_box()["y"] >= page.locator(".site-header").bounding_box()["height"]
                page.locator("input[name=name]").fill("测试姓名")
                expect(page.locator("#error-name")).to_have_count(0)
                expect(page.locator("input[name=name]")).to_have_attribute("aria-invalid", "false")
                page.locator("input[name=phone]").fill("123")
                page.locator("input[name=phone]").blur()
                expect(page.locator("#error-phone")).to_be_visible()
                page.locator("input[name=phone]").fill("13800000001")
                expect(page.locator("#error-phone")).to_have_count(0)
                page.locator("input[name=photoData]").set_input_files({
                    "name": "test.png", "mimeType": "image/png",
                    "buffer": base64.b64decode(page.evaluate("(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; return canvas.toDataURL('image/png').split(',')[1]; })()")),
                })
                expect(page.locator("#field-photoData")).not_to_have_class("photo-upload field-invalid")
                expect(page.locator("#field-photoData img")).to_be_visible()
                page.locator(".skip-link").focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url(origin + "/#register")
                expect(page.locator("#page-title")).to_be_focused()
                assert page.locator(".site-header").evaluate("el => el.getBoundingClientRect().height") <= 110
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), page.evaluate("[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth+1).map(e => [e.tagName,e.className,e.getBoundingClientRect().width]).slice(0,20)")
                for width in [320, 768, 1440]:
                    page.set_viewport_size({"width": width, "height": 900})
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"overflow at {width}px"
                page.set_viewport_size({"width": 390, "height": 844})
                output = root / ".verification"
                output.mkdir(exist_ok=True)
                page.screenshot(path=str(output / "frontend-register-mobile.png"), full_page=True)
                page.goto(origin + "/#admin")
                expect(page.locator("input[name=username]")).to_be_focused()
                for key in ["Shift+Tab"] * 8 + ["Tab"] * 8:
                    page.keyboard.press(key)
                    assert page.evaluate("!!document.activeElement.closest('[role=dialog]')")
                assert page.locator("header.site-header").evaluate("el => el.inert")
                page.keyboard.press("Escape")
                expect(page.locator("#page-title")).to_be_focused()
                assert not page.locator("header.site-header").evaluate("el => el.inert")
                print("PASS frontend: error anchors, skip link, live validation, photo errors, modal focus and mobile layout")
                page.goto(origin + "/#register")
                page.wait_for_load_state("networkidle")

                policy = {"isOpen": False, "message": "测试截止", "season": "2026", "retentionDays": 180,
                          "opensAt": "2026-09-01T00:00:00Z", "closesAt": "2026-10-02T00:00:00Z"}
                page.route("**/api/recruitment", lambda route: route.fulfill(json={"policy": policy}))
                page.evaluate("window.dispatchEvent(new Event('focus'))")
                expect(page.locator(".application-form button[type=submit]")).to_be_disabled()
                expect(page.locator(".policy-schedule")).to_contain_text("截止")
                policy.update(isOpen=True, message="测试开放")
                page.evaluate("window.dispatchEvent(new Event('focus'))")
                expect(page.locator(".application-form button[type=submit]")).to_be_enabled()
                page.unroute("**/api/recruitment")
                deadline = time.time() + 2
                def boundary_policy(route):
                    is_open = time.time() < deadline
                    route.fulfill(json={"policy": {
                        **policy, "isOpen": is_open,
                        "message": "测试开放" if is_open else "测试截止",
                        "closesAt": datetime.fromtimestamp(deadline, timezone.utc).isoformat(),
                    }})
                page.route("**/api/recruitment", boundary_policy)
                page.evaluate("window.dispatchEvent(new Event('focus'))")
                expect(page.locator(".application-form button[type=submit]")).to_be_enabled()
                expect(page.locator(".application-form button[type=submit]")).to_be_disabled(timeout=6000)
                page.unroute("**/api/recruitment")
                print("PASS frontend: refreshed opening policy and displayed deadline")

                page.goto(origin + "/#quiz")
                page.wait_for_load_state("networkidle")
                expect(page).to_have_url(origin + "/#status")
                expect(page.locator("[data-status-lookup]")).to_be_visible()
                expect(page.locator("[data-quiz-form]")).to_have_count(0)
                print("PASS frontend: old quiz bookmark redirects to progress")

                pending_lookups = []
                page.route("**/api/applications/lookup", lambda route: pending_lookups.append(route))
                page.locator("[data-status-lookup] input[name=studentId]").fill("202600000001")
                page.locator("[data-status-lookup] input[name=phone]").fill("13800000001")
                page.locator("[data-status-lookup] button[type=submit]").click()
                page.wait_for_timeout(100)
                assert len(pending_lookups) == 1
                page.locator("[data-status-lookup] input[name=studentId]").fill("202600000002")
                pending_lookups[0].fulfill(json={"record": {"studentId": "202600000001", "name": "过期查询", "status": "待审核"}})
                page.wait_for_load_state("networkidle")
                expect(page.locator(".status-result")).to_have_count(0)
                expect(page.locator("[data-status-lookup] button[type=submit]")).to_be_enabled()
                page.locator("[data-status-lookup] button[type=submit]").click()
                page.wait_for_timeout(100)
                assert len(pending_lookups) == 2
                pending_lookups[1].fulfill(json={"record": {"studentId": "202600000002", "name": "当前查询", "status": "待审核"}})
                expect(page.locator(".status-result")).to_contain_text("当前查询")
                page.locator("[data-status-lookup] input[name=phone]").fill("13800000002")
                expect(page.locator(".status-result")).to_have_count(0)
                page.unroute("**/api/applications/lookup")
                print("PASS frontend: changed lookup identity clears results and ignores stale requests")

                page.goto(origin + "/#register")
                page.wait_for_load_state("networkidle")
                page.goto(origin + "/#admin")
                page.locator("input[name=username]").fill("frontend-admin")
                page.locator("input[name=password]").fill("frontend-test-password")
                page.locator("[data-admin-gate] button[type=submit]").click()
                expect(page.locator("[data-application-list] tr")).to_have_count(20)
                rows = page.locator("[data-application-list] tr button")
                rows.first.click()
                expect(page.locator(".status-editor textarea")).to_be_enabled()
                selected_id = page.locator(".detail-heading p").inner_text()
                notice = page.locator("[data-notice-editor]")
                default_notice = notice.input_value()
                custom_notice = default_notice + "\n请加入 QQ 新生群：123456789（测试群号）。"
                page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => { window.testCopiedNotice = text; }}})")
                notice.fill(custom_notice)
                expect(page.locator("[data-notice-unsaved]")).to_be_visible()
                page.locator("[data-refresh-applications]").click()
                page.wait_for_load_state("networkidle")
                expect(notice).to_have_value(custom_notice)
                page.once("dialog", lambda dialog: dialog.dismiss())
                rows.nth(1).click()
                expect(page.locator(".detail-heading p")).to_have_text(selected_id)
                expect(notice).to_have_value(custom_notice)
                page.once("dialog", lambda dialog: dialog.dismiss())
                page.locator(".nav a[href='#status']").click()
                expect(page).to_have_url(origin + "/#admin")
                page.once("dialog", lambda dialog: dialog.dismiss())
                page.locator("[data-header-logout]").click()
                expect(page).to_have_url(origin + "/#admin")
                page.locator(".status-editor textarea").fill("通知测试审核备注")
                expect(page.locator("[data-copy-notice]")).to_be_disabled()
                page.locator(".status-editor button[type=submit]").click()
                expect(page.locator("[data-copy-notice]")).to_be_enabled()
                expect(notice).to_have_value(custom_notice)
                page.evaluate("() => { navigator.clipboard.writeText = async () => { throw new Error('test denied'); }; }")
                page.locator("[data-copy-notice]").click()
                expect(page.locator(".admin-notice")).to_contain_text("复制失败")
                expect(page.locator("[data-notice-unsaved]")).to_be_visible()
                page.evaluate("() => { navigator.clipboard.writeText = async text => { window.testCopiedNotice = text; }; }")
                page.locator("[data-copy-notice]").click()
                expect(page.locator("[data-notice-unsaved]")).to_have_count(0)
                assert page.evaluate("window.testCopiedNotice") == custom_notice
                page.locator(".review-notification").screenshot(path=str(output / "editable-notice-mobile.png"))
                page.set_viewport_size({"width": 1440, "height": 1000})
                page.locator(".review-notification").screenshot(path=str(output / "editable-notice-desktop.png"))
                page.set_viewport_size({"width": 390, "height": 844})
                rows.nth(1).click()
                expect(page.locator(".detail-heading p")).not_to_have_text(selected_id)
                expect(notice).not_to_have_value(custom_notice)
                assert "123456789" not in notice.input_value(), "custom notice must not leak to another applicant"
                notice.fill("   \n ")
                expect(page.locator("[data-copy-notice]")).to_be_disabled()
                page.locator("[data-reset-notice]").click()
                assert "报名状态" in notice.input_value()
                expect(page.locator("[data-notice-unsaved]")).to_have_count(0)
                page.locator(".status-editor select").select_option("已面试")
                page.locator(".status-editor button[type=submit]").click()
                expect(notice).to_have_value(re.compile(".*「已面试」.*", re.DOTALL))
                rows.first.click()
                expect(page.locator(".detail-heading p")).to_have_text(selected_id)
                expect(notice).to_have_value(default_notice)
                print("PASS frontend: editable notices copy exact QQ group text, preserve drafts on refresh/save, protect uncopied edits, handle copy failure, reject blank text, reset and isolate applicants")
                page.locator(".status-editor textarea").fill("尚未保存的审核备注")
                page.locator("[data-correct-application]").click()
                page.locator("[data-correction-form] input[name=name]").fill("尚未保存的姓名")
                expect(page.locator("[data-unsaved-changes]")).to_be_visible()
                page.locator("[data-refresh-applications]").click()
                page.wait_for_load_state("networkidle")
                expect(page.locator(".status-editor textarea")).to_have_value("尚未保存的审核备注")
                expect(page.locator("[data-correction-form] input[name=name]")).to_have_value("尚未保存的姓名")
                page.once("dialog", lambda dialog: dialog.dismiss())
                rows.nth(1).click()
                expect(page.locator(".detail-heading p")).to_have_text(selected_id)
                page.once("dialog", lambda dialog: dialog.dismiss())
                page.locator(".nav a[href='#status']").click()
                expect(page).to_have_url(origin + "/#admin")
                page.once("dialog", lambda dialog: dialog.dismiss())
                page.evaluate("location.hash = 'home'")
                expect(page).to_have_url(origin + "/#admin")
                page.once("dialog", lambda dialog: dialog.dismiss())
                page.locator("[data-header-logout]").click()
                expect(page).to_have_url(origin + "/#admin")
                pending_corrections = []
                page.route("**/api/applications/*/correction", lambda route: pending_corrections.append(route))
                page.locator("[data-correction-form] button[type=submit]").click()
                expect(page.locator("[data-correction-form] input[name=name]")).to_be_disabled()
                page.locator(".nav a[href='#status']").click()
                expect(page).to_have_url(origin + "/#admin")
                expect(page.locator(".admin-notice")).to_contain_text("正在处理")
                assert pending_corrections
                pending_corrections[0].continue_()
                expect(page.locator("[data-correction-form]")).to_have_count(0)
                page.unroute("**/api/applications/*/correction")
                expect(page.locator(".status-editor textarea")).to_have_value("尚未保存的审核备注")
                expect(page.locator(".admin-notice")).to_have_class("admin-notice notice-success")
                page.locator(".status-editor button[type=submit]").click()
                expect(page.locator("[data-unsaved-changes]")).to_have_count(0)
                page.route("**/api/applications?*", lambda route: route.fulfill(status=500, json={"error": "测试加载失败"}))
                page.locator("[data-refresh-applications]").click()
                expect(page.locator(".admin-notice")).to_have_class("admin-notice notice-error")
                expect(page.locator(".admin-notice")).to_have_attribute("role", "alert")
                page.unroute("**/api/applications?*")
                print("PASS frontend: unsaved review/correction survive refresh and correction save; switching, navigation, hash and logout protected; notice states")

                page.locator("[data-page-next]").click()
                expect(page.locator("[data-application-list] tr")).to_have_count(1)
                page.locator("[data-application-list] tr button").click()
                page.locator(".review-maintenance summary").click()
                expect(page.locator("[data-delete-application] input")).to_be_visible()
                student_id = page.locator("[data-delete-application] input").get_attribute("placeholder")
                page.locator("[data-delete-application] input").fill(student_id)
                page.locator("[data-delete-application-submit]").click()
                expect(page.locator("[data-application-list] tr")).to_have_count(20)
                expect(page.locator("[data-page-next]")).to_have_count(0)
                assert not exceptions, exceptions
                page.screenshot(path=str(output / "frontend-admin-mobile.png"), full_page=True)
                print("PASS frontend: deleting the final page returns to a valid page; no JavaScript errors")
                freshman_flow(browser, origin, root)
                parallax_flow(browser, origin, root)
            finally:
                browser.close()
    finally:
        server.stdin.close()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.terminate()
            server.wait(timeout=10)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
