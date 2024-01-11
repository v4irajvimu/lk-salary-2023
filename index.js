#! /usr/bin/env node
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";
import numeral from "numeral";
import Table from "cli-table3";
import gradient from "gradient-string";
import figlet from "figlet";

let basicSalary, incentive, mode;

const sleep = (delay = 1000) =>
  new Promise((resolve) => setTimeout(resolve, delay));

async function welcome() {
  const welcomeText = chalkAnimation.rainbow(
    "Welcome to the Salary Advisor \n"
  );
  await sleep();
  welcomeText.stop();
}

async function askSalary() {
  const answer = await inquirer.prompt({
    name: "salary",
    type: "input",
    message: "What is your current basic salary?",
    default() {
      return 0;
    },
  });

  if (Number(answer.salary) > 0) {
    basicSalary = Number(answer.salary);
  } else {
    await askSalary();
  }
}

async function selectMode() {
  const answer = await inquirer.prompt({
    name: "mode",
    type: "list",
    message: "Please select an option to proceed. \n",
    choices: ["Tax Calculation", "Inspect Salary"],
    default() {
      return "Tax Calculation";
    },
  });

  mode = answer.mode;
}

async function askIncentive() {
  const answer = await inquirer.prompt({
    name: "incentive",
    type: "input",
    message: "Please enter any other incentives?",
    default() {
      return 0;
    },
  });

  if (Number(answer.incentive) >= 0) {
    incentive = Number(answer.incentive);
  } else {
    await askIncentive();
  }
}

async function showSalary() {
  const spinner = createSpinner(`Calculating your salary...`).start();
  await sleep();

  const etfAmt = basicSalary * 0.03;
  const epfEmployeeAmt = basicSalary * 0.08;
  const epfEmployerAmt = basicSalary * 0.12;
  const tax = getTaxData(basicSalary + incentive);

  const takeHomeSalary =
    basicSalary + incentive - epfEmployeeAmt - numeral(tax.monthly).value();
  console.log("takeHomeSalary", takeHomeSalary);

  const employerAllocation = basicSalary + incentive + etfAmt + epfEmployerAmt;

  const monthlyTotalAfterTax =
    basicSalary +
    incentive +
    etfAmt +
    epfEmployerAmt -
    numeral(tax.monthly).value();

  const table = new Table({
    head: [gradient.cristal("Description"), gradient.cristal("Amount (LKR)")],
    colWidths: [30, 15],
    colAligns: ["left", "right"],
  });

  table.push(
    ["Basic Salary", numeral(basicSalary).format("0,0.00")],
    ["Incentives", numeral(incentive).format("0,0.00")],
    ["Total Package", numeral(incentive + basicSalary).format("0,0.00")],
    ["EPF (8%)", numeral(epfEmployeeAmt).format("0,0.00")],
    ["ETF (3%)", numeral(etfAmt).format("0,0.00")],
    ["EPF Employer (12%)", numeral(epfEmployerAmt).format("0,0.00")],
    [
      "EPF Savings (20%)",
      numeral(epfEmployerAmt + epfEmployeeAmt).format("0,0.00"),
    ],
    ["Tax Amount", tax.monthly],
    [
      gradient.pastel("TAKE HOME SALARY"),
      gradient.pastel(numeral(takeHomeSalary).format("0,0.00")),
    ],
    ["Monthly Total After Tax", numeral(monthlyTotalAfterTax).format("0,0.00")],
    ["Employer Total", numeral(employerAllocation).format("0,0.00")]
  );

  spinner.success("Successfully calculated! \n \n");
  console.log(table.toString());
}

async function showTax() {
  const spinner = createSpinner(`Calculating your tax...`).start();
  await sleep();

  const tax = getTaxData(basicSalary + incentive);

  const table = new Table({
    head: [
      gradient.cristal("Monthly Salary (Annual Salary/12)"),
      gradient.cristal("Rate (%)"),
      gradient.cristal("Tax (LKR)"),
    ],
    colWidths: [40, 10, 15],
    colAligns: ["left", "right", "right"],
  });

  const tableBody = tax.chunks.reduce((acc, item, index) => {
    return [
      ...acc,
      [
        index === 0
          ? `Up to ${item.amtMonthly}`
          : index === tax.chunks.length - 1
          ? `Above s${item.fromMonthly}`
          : `From ${item.fromMonthly} To ${item.toMonthly}`,
        index === 0 ? "Relief" : item.rate * 100,
        item.taxAmtMonthly,
      ],
    ];
  }, []);

  table.push(...tableBody, [
    "",
    gradient.pastel("Total"),
    gradient.pastel(tax.monthly),
  ]);

  spinner.success("Successfully calculated! \n \n");
  console.log(table.toString());
}

function getTaxData(taxableAmt) {
  let yearlySalary = taxableAmt * 12;
  let salaryChunks = [];
  let rate = 0.06;

  salaryChunks.push({
    from: 0,
    to: yearlySalary > 1_200_000 ? 1_200_000 : yearlySalary,
    amt: yearlySalary > 1_200_000 ? 1_200_000 : yearlySalary,
    rate: 0,
    taxAmt: 0,
  });

  yearlySalary -= 1_200_000;

  while (yearlySalary > 0) {
    if (rate === 0.36) {
      salaryChunks.push({
        from: salaryChunks[salaryChunks.length - 1].to,
        to: salaryChunks[salaryChunks.length - 1].to + yearlySalary,
        amt: yearlySalary,
        rate,
        taxAmt: yearlySalary * rate,
      });
      yearlySalary = 0;
    } else {
      if (yearlySalary > 500_000) {
        salaryChunks.push({
          from: salaryChunks[salaryChunks.length - 1].to,
          to: salaryChunks[salaryChunks.length - 1].to + 500_000,
          amt: 500_000,
          rate,
          taxAmt: 500_000 * rate,
        });
      } else {
        salaryChunks.push({
          from: salaryChunks[salaryChunks.length - 1].to,
          to: salaryChunks[salaryChunks.length - 1].to + yearlySalary,
          amt: yearlySalary,
          rate,
          taxAmt: yearlySalary * rate,
        });
      }
    }

    rate += 0.06;
    yearlySalary -= 500_000;
  }

  return {
    yearly: numeral(
      salaryChunks.reduce((acc, item) => (acc += item.taxAmt), 0)
    ).format("0,0.00"),
    monthly: numeral(
      salaryChunks.reduce((acc, item) => acc + item.taxAmt, 0) / 12
    ).format("0,0.00"),
    chunks: salaryChunks.map((item) => ({
      ...item,
      fromMonthly: numeral(item.from / 12).format("0,0.00"),
      toMonthly: numeral(item.to / 12).format("0,0.00"),
      amtMonthly: numeral(item.amt / 12).format("0,0.00"),
      taxAmtMonthly: numeral(item.taxAmt / 12).format("0,0.00"),
    })),
  };

  return salaryChunks;
}

async function handleEnd() {
  const answer = await inquirer.prompt({
    name: "inTheEnd",
    type: "list",
    message: "\n Do you want to process again? \n",
    choices: ["Yes", "No"],
    default() {
      return "Yes";
    },
  });

  if (answer.inTheEnd === "Yes") {
    await main();
  } else {
    console.clear();
    const msg = "Thank you...!";
    figlet(msg, (err, data) => {
      console.log(gradient.pastel.multiline(data));
      console.log(
        `\n ${gradient.pastel(
          "All Right Reserved. © 2020-2024 | Vimukthi Jayasinghe"
        )}`
      );
    });

    await sleep();
    process.exit(1);
  }
}

async function main() {
  await welcome();
  await selectMode();
  await askSalary();
  await askIncentive();

  if (mode === "Tax Calculation") {
    await taxCalculation();
  } else {
    await salaryInspection();
  }
}

async function taxCalculation() {
  await showTax();
  await handleEnd();
}

async function salaryInspection() {
  await showSalary();
  await handleEnd();
}

await main();
