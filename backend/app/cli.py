"""python -m app.cli ingest | locate "<headline>" """

import argparse
import logging

from app import services
from app.db import SessionLocal, init_db
from app.pipeline.locator import get_locator


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("ingest", help="Fetch all RSS sources once")
    locate = commands.add_parser("locate", help="Debug province extraction for a headline")
    locate.add_argument("text")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if args.command == "ingest":
        init_db()
        with SessionLocal() as session:
            print(services.run_ingest(session))
    elif args.command == "locate":
        result = get_locator().locate(args.text)
        print(result.plate, result.scores)


if __name__ == "__main__":
    main()
