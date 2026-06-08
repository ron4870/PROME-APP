import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@promeconsult.com',
    pass: 'ketiswrgkmowpmvb', // Ensure this is stored in ENV in a real deployment
  },
});

export const setupCronJobs = () => {
  // Run every Friday at 08:00 AM
  cron.schedule('0 8 * * 5', async () => {
    console.log('Running weekly cron job for Overall Project Progress trackers...');

    try {
      const trackerTasks = await prisma.projectTask.findMany({
        where: {
          isOverallProgressTracker: true,
          status: { not: 'Completed' },
          project: {
            status: { not: 'Closed' }
          },
          assignedToId: { not: null }
        },
        include: {
          project: true,
          assignedTo: true
        }
      });

      for (const task of trackerTasks) {
        if (task.assignedTo && task.assignedTo.email) {
          const mailOptions = {
            from: '"PROME Intranet Portal" <admin@promeconsult.com>',
            to: task.assignedTo.email,
            subject: `Action Required: Update Overall Progress for ${task.project.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Weekly Progress Update Reminder</h2>
                <p>Hello ${task.assignedTo.name},</p>
                <p>This is a weekly system reminder to update the <strong>Overall Project Progress</strong> for the project: <strong>${task.project.name}</strong>.</p>
                <p>The current recorded progress is: <span style="font-size: 1.2rem; font-weight: bold; color: #0ea5e9;">${task.progress}%</span></p>
                <p>Please log in to the PROME Intranet Portal and update the progress value in the Project Schedule or Dashboard to reflect this week's advancements.</p>
                <br>
                <a href="https://ims.promeconsult.com/projects/${task.project.id}" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Project Dashboard</a>
                <br><br>
                <p style="color: #64748b; font-size: 0.9rem;">Best regards,<br>PROME System Administrator</p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log(`Sent progress update reminder to ${task.assignedTo.email} for project ${task.project.id}`);
        }
      }
    } catch (error) {
      console.error('Error running weekly progress cron job:', error);
    }
  });

  // Run daily at 08:00 AM for Task Frequencies
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily cron job for task frequency notifications...');

    try {
      const tasksWithFrequency = await prisma.projectTask.findMany({
        where: {
          frequency: { not: null },
          status: { not: 'Completed' },
          project: { status: { not: 'Closed' } },
          assignedToId: { not: null }
        },
        include: {
          project: true,
          assignedTo: true
        }
      });

      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

      for (const task of tasksWithFrequency) {
        let shouldNotify = false;
        const lastNotified = task.lastNotificationDate ? new Date(task.lastNotificationDate) : null;

        if (task.frequency === 'Daily') {
          shouldNotify = true;
        } else if (task.frequency === 'Weekdays (Monday-Friday)') {
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            shouldNotify = true;
          }
        } else if (task.frequency === 'Weekly') {
          if (!lastNotified || (today.getTime() - lastNotified.getTime()) > 6 * 24 * 60 * 60 * 1000) {
             shouldNotify = true;
          }
        } else if (task.frequency === 'Monthly') {
           if (!lastNotified || (today.getTime() - lastNotified.getTime()) > 28 * 24 * 60 * 60 * 1000) {
             shouldNotify = true;
          }
        } else if (task.frequency === 'Quarterly (Every 3 Months)') {
           if (!lastNotified || (today.getTime() - lastNotified.getTime()) > 88 * 24 * 60 * 60 * 1000) {
             shouldNotify = true;
          }
        } else if (task.frequency === 'Annual') {
           if (!lastNotified || (today.getTime() - lastNotified.getTime()) > 364 * 24 * 60 * 60 * 1000) {
             shouldNotify = true;
          }
        }

        if (shouldNotify && task.assignedToId) {
          // 1. Create a notification in the DB
          await prisma.notification.create({
            data: {
              userId: task.assignedToId,
              projectId: task.projectId,
              title: `Task Reminder: ${task.title}`,
              message: `You have a recurring task (${task.frequency}): ${task.title} in project ${task.project.name}.`,
              type: 'ProjectTask',
              link: `/projects/${task.projectId}`
            }
          });

          // 2. Update lastNotificationDate
          await prisma.projectTask.update({
            where: { id: task.id },
            data: { lastNotificationDate: today }
          });

          // 3. Send Email
          if (task.assignedTo && task.assignedTo.email) {
            const mailOptions = {
              from: '"PROME Intranet Portal" <admin@promeconsult.com>',
              to: task.assignedTo.email,
              subject: `Task Reminder: ${task.title} - ${task.project.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #0f172a;">Task Reminder (${task.frequency})</h2>
                  <p>Hello ${task.assignedTo.name},</p>
                  <p>This is a system reminder for the following task:</p>
                  <ul>
                    <li><strong>Project:</strong> ${task.project.name}</li>
                    <li><strong>Task:</strong> ${task.title}</li>
                    <li><strong>Status:</strong> ${task.status}</li>
                    <li><strong>Progress:</strong> ${task.progress}%</li>
                  </ul>
                  <br>
                  <a href="https://ims.promeconsult.com/projects/${task.project.id}" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Project Dashboard</a>
                  <br><br>
                  <p style="color: #64748b; font-size: 0.9rem;">Best regards,<br>PROME System Administrator</p>
                </div>
              `
            };

            await transporter.sendMail(mailOptions);
            console.log(`Sent task frequency reminder to ${task.assignedTo.email} for task ${task.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error running daily task frequency cron job:', error);
    }
  });

  console.log('Cron jobs initialized successfully.');
};
