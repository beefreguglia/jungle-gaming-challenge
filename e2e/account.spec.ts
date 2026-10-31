import { expect, test } from '@playwright/test'

import { mock, PASSWORD, signInAt, submitSignIn, USERS } from './support/app.ts'

// 1×1 transparent PNG, enough for the avatar upload
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

// E2E #8: edição de perfil, avatar, senha e carteiras, com erros de validação
test.describe('conta', () => {
  test('perfil valida campos, trata e-mail em uso e persiste após o refresh', async ({ page }) => {
    await signInAt(page, '/conta/perfil', USERS.nova.email)
    const form = page.getByRole('form', { name: 'Perfil do colecionador' })
    const name = form.getByLabel('Nome de exibição')
    const email = form.getByLabel('E-mail')

    await name.fill('')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(name).toHaveAccessibleDescription('Campo obrigatório')
    await expect(name).toBeFocused()

    await name.fill('Nova S.')
    await email.fill(USERS.kai.email)
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(email).toHaveAccessibleDescription('Este e-mail já está cadastrado')

    await email.fill(USERS.nova.email)
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()
    await page.reload()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Nova S.')
  })

  test('avatar recusa tipo inválido, envia uma imagem e pode ser removido', async ({ page }) => {
    await signInAt(page, '/conta/perfil', USERS.nova.email)
    const picker = page.locator('input[type="file"]')

    await picker.setInputFiles({
      name: 'notas.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('oi'),
    })
    await expect(page.getByRole('alert')).toHaveText('Use uma imagem PNG, JPEG ou WebP')

    await picker.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()

    await page.getByRole('button', { name: 'Remover avatar' }).click()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toHaveCount(0)
  })

  test('senha exige a atual correta e passa a valer no próximo login', async ({ page }) => {
    await signInAt(page, '/conta/perfil', USERS.kai.email)
    const form = page.getByRole('form', { name: 'Alterar senha' })
    const current = form.getByLabel('Senha atual')

    await current.fill('errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('novasenha9')
    await form.getByLabel('Confirmar nova senha').fill('novasenha9')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(current).toHaveAccessibleDescription('Senha atual incorreta')

    await current.fill(PASSWORD)
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha alterada')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).first().click()
    await page.goto('/login')
    await submitSignIn(page, USERS.kai.email, 'novasenha9')
    await expect(page).toHaveURL('/')
  })

  test('carteiras validam o endereço pela rede, salvam e a secundária repete a principal', async ({
    page,
  }) => {
    // Kai starts without wallets
    await signInAt(page, '/conta/carteiras', USERS.kai.email)
    const primary = page.getByRole('region', { name: 'Carteira principal' })
    const same = page.getByRole('checkbox', { name: 'Igual à carteira principal' })
    await expect(same).toBeDisabled()

    await primary.getByLabel('Nome de exibição').fill('Kai Moreno')
    await primary.getByLabel('Apelido da carteira').fill('Carteira do Kai')
    await primary.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Solana' }).click()
    await primary.getByLabel('Nome do perfil').fill('Kai')
    await primary
      .getByLabel('Endereço da carteira')
      .fill('0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8')
    await primary.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'Coinbase Wallet' }).click()
    await primary.getByLabel('Código de indicação').fill('kai2026')
    await primary.getByLabel('E-mail').fill(USERS.kai.email)
    await primary.getByLabel('Nome ENS').fill('kaimoreno')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    // An EVM address is not valid on Solana
    await expect(primary.getByLabel('Endereço da carteira')).toHaveAccessibleDescription(
      'Endereço Solana inválido',
    )

    await primary
      .getByLabel('Endereço da carteira')
      .fill('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira salva')).toBeVisible()

    await expect(same).toBeEnabled()
    await same.check()
    await expect(page.getByText('Usa os mesmos dados da carteira principal.')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Igual à carteira principal' })).toBeChecked()
    await expect(primary.getByLabel('Código de indicação')).toHaveValue('KAI2026')
  })

  test('acesso não autorizado (403) é informado sem encerrar a sessão', async ({ page }) => {
    await signInAt(page, '/conta/carteiras', USERS.nova.email)
    await mock(page).setScenario('unauthorized')
    await page.goto('/conta/perfil')
    await expect(page.getByRole('alert')).toHaveText(
      'Você não tem permissão para acessar este perfil.',
    )
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(0)
    // 403 is not 401: the user stays signed in on the other pages
    await page.getByRole('link', { name: 'Carteiras' }).first().click()
    await expect(page.getByRole('region', { name: 'Carteira principal' })).toBeVisible()
  })
})
