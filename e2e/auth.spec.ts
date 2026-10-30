import { expect, test } from '@playwright/test'

import { mock, openApp, PASSWORD, signInAt, submitSignIn, USERS } from './support/app.ts'

// E2E #3: cadastro, login, expiração de sessão, logout e troca de usuário
test.describe('autenticação', () => {
  test('cadastro valida os campos, trata e-mail em uso e cria a conta', async ({ page }) => {
    await openApp(page, '/cadastro')
    const form = page.getByRole('form', { name: 'Criar conta' })
    const username = form.getByLabel('Nome de usuário')
    const email = form.getByLabel('E-mail')

    await form.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    await expect(username).toHaveAccessibleDescription('Use pelo menos 3 caracteres')
    await expect(email).toHaveAccessibleDescription('Informe o e-mail')
    await expect(form.getByLabel('Confirmar senha')).toHaveAccessibleDescription('Confirme a senha')
    await expect(username).toBeFocused()

    await username.fill('colecionador_1')
    await email.fill(USERS.nova.email)
    await form.getByLabel('Senha', { exact: true }).fill('segredo123')
    await form.getByLabel('Confirmar senha').fill('segredo123')
    await form.getByRole('button', { name: 'Criar perfil' }).click()
    // Conflict answered by the API, shown on the field it belongs to
    await expect(email).toHaveAccessibleDescription('Este e-mail já está cadastrado')
    await expect(email).toBeFocused()

    await email.fill('colecionador@kurio.art')
    await form.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Conta criada. Boas-vindas, colecionador_1!')).toBeVisible()

    // The session survives a refresh and opens private pages
    await page.goto('/conta')
    await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible()
  })

  test('login recusa senha errada e volta para a página protegida', async ({ page }) => {
    await openApp(page, '/conta')
    await expect(page).toHaveURL('/login?redirect=%2Fconta')
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeAttached()

    await submitSignIn(page, USERS.nova.email, 'senha-errada1')
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos')

    await submitSignIn(page, USERS.nova.email, PASSWORD)
    await expect(page).toHaveURL('/conta')
    await expect(page.getByText(`Olá de novo, ${USERS.nova.name}!`)).toBeVisible()
  })

  test('sessão expirada leva ao login e retoma a página depois', async ({ page }) => {
    await signInAt(page, '/conta', USERS.nova.email)

    await mock(page).expireSessions()
    await page.reload()
    await expect(page).toHaveURL('/login?redirect=%2Fconta')
    await expect(page.getByText('Sua sessão expirou')).toBeVisible()

    await submitSignIn(page, USERS.nova.email)
    await expect(page).toHaveURL('/conta')
  })

  test('logout limpa a sessão e a troca de usuário reconecta o socket', async ({
    page,
    isMobile,
  }) => {
    await signInAt(page, '/conta', USERS.nova.email)
    await expect.poll(() => mock(page).realtimeUsers()).toEqual([USERS.nova.id])

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Você saiu da sua conta')).toBeVisible()
    await expect.poll(() => mock(page).realtimeUsers()).toEqual([null])

    // Another user signs in on the same tab, without a reload
    if (isMobile) {
      await page.getByRole('link', { name: 'Minha conta' }).click()
      await expect(page).toHaveURL('/login?redirect=%2Fconta')
    } else {
      await page.getByRole('button', { name: 'Entrar' }).click()
    }
    await submitSignIn(page, USERS.kai.email)
    await expect(page.getByText(`Olá de novo, ${USERS.kai.name}!`)).toBeVisible()
    await expect.poll(() => mock(page).realtimeUsers()).toEqual([USERS.kai.id])
  })

  test('dialog do header prende o foco, fecha com Esc e mantém a página', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'O dialog é a entrada do desktop; no mobile o login é tela cheia')
    await openApp(page, '/carrinho')
    const trigger = page.getByRole('button', { name: 'Entrar' })

    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Acesse sua conta' })
    await expect(dialog).toBeVisible()
    for (let step = 0; step < 12; step += 1) await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)

    // An open "em breve" tooltip is the top layer and takes the first Esc, so leave it first
    await dialog.getByLabel('E-mail').focus()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await dialog.getByRole('tab', { name: 'Criar conta' }).click()
    await expect(dialog.getByRole('form', { name: 'Criar conta' })).toBeVisible()
    await dialog.getByRole('tab', { name: 'Entrar' }).click()

    await submitSignIn(page, USERS.nova.email)
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL('/carrinho')
    await expect(page.getByRole('link', { name: USERS.nova.name })).toBeVisible()
  })
})
