const { chromium } = require('C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1588, height: 1123 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:41651/');
  await page.evaluate(() => {
    localStorage.removeItem('wamyUsers');
    localStorage.removeItem('wamyEmployees');
    localStorage.removeItem('wamyCategories');
    sessionStorage.removeItem('wamySession');
  });
  await page.reload();
  await page.locator('img.logo').waitFor({ state: 'visible' });
  assert.match(await page.locator('img.logo').getAttribute('src'), /wamy-logo\.png$/);
  await page.evaluate(() => {
    const versionTwoEmployees = employees.map(person => ({ ...person, category: person.category === 'مديرو مكاتب' ? 'المشرفون' : person.category === 'حراس الأمن' ? 'الموظفون' : person.category }));
    localStorage.setItem('wamyEmployees', JSON.stringify(versionTwoEmployees));
    localStorage.setItem('wamyDirectoryDataVersion', '2');
  });
  await page.reload();
  assert.equal(await page.evaluate(() => employees.filter(person => person.category === 'المشرفون').length), 0);
  assert.equal(await page.evaluate(() => employees.filter(person => person.category === 'مديرو مكاتب').length), 2);
  assert.equal(await page.evaluate(() => employees.filter(person => person.category === 'نواب الإدارات').length), 1);
  assert.equal(await page.evaluate(() => employees.filter(person => person.category === 'حراس الأمن').length), 1);
  assert.equal(await page.locator('#stats .stat').count(), 13, `categories=${JSON.stringify(await page.evaluate(() => categories))}`);
  const dashboardLabels = await page.locator('#stats .stat span').allTextContents();
  for (const label of ['إجمالي الأفراد', 'الإدارة العليا', 'مساعدو الأمين العام', 'المستشارون', 'مديرو الإدارات', 'نواب الإدارات', 'مديرو مكاتب', 'مديرو مكاتب الندوة', 'رؤساء الأقسام', 'رؤساء اللجان', 'حراس الأمن', 'الموظفون', 'في المفضلة']) {
    assert.ok(dashboardLabels.includes(label));
  }
  await page.getByRole('button', { name: /الهيكل الإداري/ }).click();
  await page.getByRole('button', { name: 'بطاقات التصنيفات' }).click();
  assert.equal(await page.locator('.category-card').count(), 11);
  assert.equal(await page.locator('.category-card summary').filter({ hasText: 'نواب الإدارات' }).count(), 1);
  assert.equal(await page.locator('.category-card').getByText('مديرو مكاتب', { exact: true }).count(), 1);
  assert.equal(await page.locator('.category-card summary').filter({ hasText: 'حراس الأمن' }).count(), 1);
  assert.equal(await page.locator('.category-card summary').filter({ hasText: 'مديرو مكاتب الندوة' }).count(), 1);
  const updateBeforeBrowsing = await page.locator('#directoryUpdateValue').textContent();
  await page.getByRole('button', { name: /مكاتب الندوة الدولية/ }).click();
  assert.equal(await page.locator('.office-card').count(), 33);
  assert.equal(await page.locator('#officesCount').textContent(), '33 مكتب');
  const kenyaOffice = page.locator('.office-card').filter({ hasText: 'مكتب كينيا' });
  await kenyaOffice.locator('summary').click();
  assert.equal(await kenyaOffice.locator('.office-person strong').first().textContent(), 'إرشاد عبده إبراهيم');
  assert.equal(await page.locator('#directoryUpdateValue').textContent(), updateBeforeBrowsing);
  await page.getByRole('button', { name: 'دخول الإدارة' }).click();
  await page.locator('#loginUsername').fill('admin');
  await page.locator('#loginPassword').fill('Admin@2026');
  await page.getByRole('button', { name: 'دخول', exact: true }).click();
  await page.getByRole('button', { name: /إدارة البيانات/ }).click();
  assert.equal(await page.locator('#categoriesTable tbody tr').count(), 11);
  await page.getByRole('button', { name: '+ إضافة تصنيف' }).click();
  await page.locator('#categoryName').fill('المتعاونون');
  await page.locator('#categoryModal .btn.primary').click();
  assert.equal(await page.locator('#categoriesTable tbody tr').count(), 12);
  assert.equal(await page.locator('#printChecks input[value="المتعاونون"]').count(), 1);
  await page.evaluate(() => openEmployeeModal(1));
  await page.locator('#f_category').selectOption('المتعاونون');
  await page.locator('#employeeModal .btn.primary').click();
  const customCategoryIndex = await page.evaluate(() => categories.indexOf('المتعاونون'));
  await page.evaluate(index => openCategoryModal(index), customCategoryIndex);
  await page.locator('#categoryName').fill('المتعاونون الخارجيون');
  await page.locator('#categoryModal .btn.primary').click();
  assert.equal(await page.evaluate(() => employees.find(person => person.id === 1).category), 'المتعاونون الخارجيون');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('wamyCategories')).includes('المتعاونون الخارجيون')));
  page.once('dialog', async dialog => {
    assert.match(dialog.message(), /لا يمكن حذف/);
    await dialog.accept();
  });
  await page.evaluate(() => deleteCategory(categories.indexOf('المتعاونون الخارجيون')));
  assert.ok(await page.evaluate(() => categories.includes('المتعاونون الخارجيون')));
  await page.evaluate(() => { categories.push('تصنيف مؤقت'); save(); renderAll(); });
  page.once('dialog', dialog => dialog.accept());
  await page.evaluate(() => deleteCategory(categories.indexOf('تصنيف مؤقت')));
  assert.ok(await page.evaluate(() => !categories.includes('تصنيف مؤقت')));
  await page.reload();
  assert.ok(await page.evaluate(() => categories.includes('المتعاونون الخارجيون')));
  assert.equal(await page.evaluate(() => employees.find(person => person.id === 1).category), 'المتعاونون الخارجيون');
  await page.getByRole('button', { name: /إدارة البيانات/ }).click();
  await page.locator('#adminSearch').fill('أمين الغامدي');
  assert.equal(await page.locator('#adminTable tbody tr').count(), 1);
  assert.equal(await page.locator('#adminSearchCount').textContent(), '1 من 323 سجل');
  await page.locator('#adminSearch').fill('');
  assert.equal(await page.locator('#adminTable tbody tr').count(), 323);
  await page.evaluate(() => openEmployeeModal(1));
  await page.locator('#f_mobile').fill('+966500000001');
  await page.locator('#f_email').fill('person@example.org');
  await page.locator('#employeeModal .btn.primary').click();
  assert.notEqual(await page.locator('#directoryUpdateValue').textContent(), updateBeforeBrowsing);
  await page.locator('#adminSearch').fill('person@example.org');
  assert.equal(await page.locator('#adminTable tbody tr').count(), 1);
  assert.equal(await page.locator('#adminTable a[href="mailto:person@example.org"]').count(), 1);
  await page.locator('#adminSearch').fill('+966500000001');
  assert.equal(await page.locator('#adminTable tbody tr').count(), 1);
  assert.equal(await page.locator('#adminTable a[href="tel:+966500000001"]').count(), 1);
  await page.locator('#adminSearch').fill('');
  await page.getByRole('button', { name: /مكاتب الندوة الدولية/ }).click();
  assert.equal(await page.locator('.office-card').count(), 33);
  await page.getByRole('button', { name: /إدارة البيانات/ }).click();
  const backupSummary = await page.evaluate(() => {
    const payload = buildBackupPayload();
    const restored = validateBackupPayload(payload);
    return { format: payload.format, employees: restored.employees.length, users: restored.users.length };
  });
  assert.deepEqual(backupSummary, { format: 'wamy-directory-backup', employees: 323, users: 1 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'تصدير نسخة احتياطية' }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^نسخة_احتياطية_دليل_الموظفين_\d{4}-\d{2}-\d{2}\.json$/);
  await page.getByRole('button', { name: /الطباعة والتصدير/ }).click();
  await page.locator('#paper').selectOption('A3');
  await page.locator('#orientation').selectOption('landscape');
  await page.locator('#templatePreset').selectOption('full');
  await page.evaluate(() => {
    window.print = () => {};
    generatePrint();
  });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.a3-column').count(), 10);
  assert.equal(await page.locator('.a3-sheet').count(), 2);
  assert.equal(await page.locator('.directory-row').count(), 323);
  const columnOverflow = await page.locator('.a3-column').evaluateAll(columns => columns.map((column, index) => ({
    index,
    clientHeight: column.clientHeight,
    scrollHeight: column.scrollHeight,
    overflow: column.scrollHeight - column.clientHeight
  })));
  assert.deepEqual(columnOverflow.filter(column => column.overflow > 1), []);
  await page.screenshot({ path: 'a3-export-preview.png', fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto('http://127.0.0.1:41651/');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  await mobile.close();
  console.log(JSON.stringify({ pages: 2, columns: 10, rows: await page.locator('.directory-row').count(), groups: await page.locator('.directory-heading').count(), maxColumnOverflow: Math.max(...columnOverflow.map(column => column.overflow)) }));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
