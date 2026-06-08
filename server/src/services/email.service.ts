import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@promeconsult.com',
    pass: 'ketiswrgkmowpmvb',
  },
});

export const sendTaskAssignmentEmail = async (email: string, name: string, projectName: string, taskTitle: string, projectId: number) => {
  const mailOptions = {
    from: '"PROME Intranet Portal" <admin@promeconsult.com>',
    to: email,
    subject: `New Task Assigned: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">New Task Assignment</h2>
        <p>Hello ${name},</p>
        <p>You have been assigned a new task in the project <strong>${projectName}</strong>.</p>
        <ul>
          <li><strong>Task:</strong> ${taskTitle}</li>
        </ul>
        <br>
        <a href="https://ims.promeconsult.com/projects/${projectId}" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Project Dashboard</a>
        <br><br>
        <p style="color: #64748b; font-size: 0.9rem;">Best regards,<br>PROME System Administrator</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Sent task assignment email to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
