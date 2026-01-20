import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env} from './types';
import { 
  createMailbox, 
  getMailbox, 
  deleteMailbox, 
  getEmails, 
  getEmail, 
  deleteEmail,
  getAttachments,
  getAttachment,
  convertMailboxToPermanent
} from './database';
import { generateRandomAddress, validateCustomAddress } from './utils';
import { generateNameAddress } from './name-generator';

// Address type for mailbox creation
type AddressType = 'name' | 'random' | 'custom';

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>();

// 添加 CORS 中间件
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// 健康检查端点
app.get('/', (c) => {
  return c.json({ status: 'ok', message: '临时邮箱系统API正常运行' });
});

// 获取系统配置
app.get('/api/config', (c) => {
  try {
    const emailDomains = c.env.VITE_EMAIL_DOMAIN || '';
    const domains = emailDomains.split(',').map((domain: string) => domain.trim()).filter((domain: string) => domain);
    
    return c.json({ 
      success: true, 
      config: {
        emailDomains: domains
      }
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return c.json({ 
      success: false, 
      error: '获取配置失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});


// 创建邮箱
app.post('/api/mailboxes', async (c) => {
  try {
    const body = await c.req.json();
    
    // 获取地址类型，默认为 'random'
    const addressType: AddressType = body.addressType || 'random';
    
    // 验证 addressType 参数
    if (!['name', 'random', 'custom'].includes(addressType)) {
      return c.json({ success: false, error: '无效的地址类型' }, 400);
    }
    
    // 获取 isPermanent 参数，默认为 false
    const isPermanent: boolean = typeof body.isPermanent === 'boolean' ? body.isPermanent : false;
    
    // 验证 isPermanent 只能用于 name 或 custom 类型
    if (isPermanent && addressType === 'random') {
      return c.json({ 
        success: false, 
        error: 'Random mailboxes cannot be permanent' 
      }, 400);
    }
    
    const expiresInHours = 24; // 固定24小时有效期（永久邮箱会被忽略）
    
    // 获取客户端IP
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    
    let address: string;
    
    // 根据地址类型生成或验证地址
    switch (addressType) {
      case 'name':
        // 使用英文名生成器
        address = generateNameAddress();
        break;
        
      case 'custom':
        // 自定义地址：验证用户提供的地址
        if (!body.address || typeof body.address !== 'string') {
          return c.json({ success: false, error: '自定义地址类型需要提供 address 参数' }, 400);
        }
        
        // 验证自定义地址格式
        const validation = validateCustomAddress(body.address);
        if (!validation.valid) {
          return c.json({ success: false, error: `地址格式无效: ${validation.error}` }, 400);
        }
        
        address = body.address.toLowerCase();
        break;
        
      case 'random':
      default:
        // 使用随机生成器（兼容旧的 body.address 参数）
        address = body.address || generateRandomAddress();
        
        // 如果提供了自定义地址，也需要验证
        if (body.address) {
          const validation = validateCustomAddress(body.address);
          if (!validation.valid) {
            return c.json({ success: false, error: `地址格式无效: ${validation.error}` }, 400);
          }
          address = body.address.toLowerCase();
        }
        break;
    }
    
    // 检查邮箱是否已存在
    const existingMailbox = await getMailbox(c.env.DB, address);
    if (existingMailbox) {
      return c.json({ success: false, error: '邮箱地址已存在' }, 400);
    }
    
    // 创建邮箱
    const mailbox = await createMailbox(c.env.DB, {
      address,
      addressType,
      expiresInHours,
      ipAddress: ip,
      isPermanent
    });
    
    // 返回结果，包含 addressType 和 isPermanent 字段
    return c.json({ 
      success: true, 
      mailbox: {
        ...mailbox,
        addressType
      }
    });
  } catch (error) {
    console.error('创建邮箱失败:', error);
    return c.json({ 
      success: false, 
      error: '创建邮箱失败',
      message: error instanceof Error ? error.message : String(error)
    }, 400);
  }
});

// 获取邮箱信息
app.get('/api/mailboxes/:address', async (c) => {
  try {
    const address = c.req.param('address');
    const mailbox = await getMailbox(c.env.DB, address);
    
    if (!mailbox) {
      return c.json({ success: false, error: '邮箱不存在' }, 404);
    }
    
    return c.json({ success: true, mailbox });
  } catch (error) {
    console.error('获取邮箱失败:', error);
    return c.json({ 
      success: false, 
      error: '获取邮箱失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 将临时邮箱转换为永久邮箱
app.patch('/api/mailboxes/:address/convert-to-permanent', async (c) => {
  try {
    const address = c.req.param('address');
    
    // 检查邮箱是否存在
    const mailbox = await getMailbox(c.env.DB, address);
    if (!mailbox) {
      return c.json({ success: false, error: 'Mailbox not found' }, 404);
    }
    
    // 拒绝随机邮箱的转换
    if (mailbox.addressType === 'random') {
      return c.json({ 
        success: false, 
        error: 'Random mailboxes cannot be converted to permanent' 
      }, 403);
    }
    
    // 检查是否已经是永久邮箱
    if (mailbox.isPermanent) {
      return c.json({ 
        success: true, 
        message: 'Mailbox is already permanent',
        mailbox 
      });
    }
    
    // 转换为永久邮箱
    const converted = await convertMailboxToPermanent(c.env.DB, address);
    
    if (!converted) {
      return c.json({ 
        success: false, 
        error: 'Failed to convert mailbox' 
      }, 500);
    }
    
    // 获取更新后的邮箱
    const updatedMailbox = await getMailbox(c.env.DB, address);
    
    return c.json({ 
      success: true, 
      message: 'Mailbox converted to permanent',
      mailbox: updatedMailbox 
    });
  } catch (error) {
    console.error('Convert mailbox failed:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to convert mailbox',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 删除邮箱
app.delete('/api/mailboxes/:address', async (c) => {
  try {
    const address = c.req.param('address');
    const result = await deleteMailbox(c.env.DB, address);
    
    if (!result.success) {
      if (result.error === 'Cannot delete permanent mailbox') {
        return c.json({ 
          success: false, 
          error: result.error 
        }, 403);
      }
      return c.json({ 
        success: false, 
        error: result.error 
      }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('删除邮箱失败:', error);
    return c.json({ 
      success: false, 
      error: '删除邮箱失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 获取邮件列表
app.get('/api/mailboxes/:address/emails', async (c) => {
  try {
    const address = c.req.param('address');
    const mailbox = await getMailbox(c.env.DB, address);
    
    if (!mailbox) {
      return c.json({ success: false, error: '邮箱不存在' }, 404);
    }
    
    const emails = await getEmails(c.env.DB, mailbox.id);
    
    return c.json({ success: true, emails });
  } catch (error) {
    console.error('获取邮件列表失败:', error);
    return c.json({ 
      success: false, 
      error: '获取邮件列表失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 获取邮件详情
app.get('/api/emails/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const email = await getEmail(c.env.DB, id);
    
    if (!email) {
      return c.json({ success: false, error: '邮件不存在' }, 404);
    }
    
    return c.json({ success: true, email });
  } catch (error) {
    console.error('获取邮件详情失败:', error);
    return c.json({ 
      success: false, 
      error: '获取邮件详情失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 获取邮件的附件列表
app.get('/api/emails/:id/attachments', async (c) => {
  try {
    const id = c.req.param('id');
    
    // 检查邮件是否存在
    const email = await getEmail(c.env.DB, id);
    if (!email) {
      return c.json({ success: false, error: '邮件不存在' }, 404);
    }
    
    // 获取附件列表
    const attachments = await getAttachments(c.env.DB, id);
    
    return c.json({ success: true, attachments });
  } catch (error) {
    console.error('获取附件列表失败:', error);
    return c.json({ 
      success: false, 
      error: '获取附件列表失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 获取附件详情
app.get('/api/attachments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const attachment = await getAttachment(c.env.DB, id);
    
    if (!attachment) {
      return c.json({ success: false, error: '附件不存在' }, 404);
    }
    
    // 检查是否需要直接返回附件内容
    const download = c.req.query('download') === 'true';
    
    if (download) {
      // 将Base64内容转换为二进制
      const binaryContent = atob(attachment.content);
      const bytes = new Uint8Array(binaryContent.length);
      for (let i = 0; i < binaryContent.length; i++) {
        bytes[i] = binaryContent.charCodeAt(i);
      }
      
      // 设置响应头
      c.header('Content-Type', attachment.mimeType);
      c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
      
      return c.body(bytes);
    }
    
    // 返回附件信息（不包含内容，避免响应过大）
    return c.json({ 
      success: true, 
      attachment: {
        id: attachment.id,
        emailId: attachment.emailId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt,
        isLarge: attachment.isLarge,
        chunksCount: attachment.chunksCount
      }
    });
  } catch (error) {
    console.error('获取附件详情失败:', error);
    return c.json({ 
      success: false, 
      error: '获取附件详情失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 删除邮件
app.delete('/api/emails/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteEmail(c.env.DB, id);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('删除邮件失败:', error);
    return c.json({ 
      success: false, 
      error: '删除邮件失败',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default app;