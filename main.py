from fastapi import FastAPI
import pandas as pd 
from pydantic import BaseModel , Field
import joblib
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware , 
    allow_origins=["http://127.0.0.1:5500"] ,
    # allow_credentials=True, 
    allow_methods=["*"] , 
    allow_headers=["*"]
)



COLUMNS  =  ['neighbourhood_group', 'neighbourhood', 'latitude', 'longitude',
        'price', 'minimum_nights', 'number_of_reviews',
       'reviews_per_month', 'calculated_host_listings_count',
       'availability_365' ]



# Create Pydantic model for input validation
class Features(BaseModel):
    neighbourhood:str=Field(... , min_length=1 , description="Neighbourhod name ")
    neighbourhood_group : str = Field(... , min_length=1 , description="Neighbourhood group")
    latitude: float =Field(... , ge=-90 , le=90 , description="Latitude   must be between -90 to 90 ")
    longitude: float = Field(... , ge=-80 , le=180 , description="Longitude range must be -180 to 180")
    price: float = Field(... , gt=0 , description="Price must be greater than 0")
    minimum_nights : int = Field(... , ge=  1 , le=365 , description="Minimum nights must be above 0")
    number_of_reviews: int = Field(... , ge = 0  , description="Number of reviews must be greater then 0 ( Total number of review )")
    reviews_per_month : float = Field(... , ge=0 , description="Average review per month")
    calculated_host_listings_count : int = Field ( ... , ge =0 , description="Number of listing by this host ")
    availability_365 : int = Field(... , ge=0 , le=365 , description="Days avialbel out of 365 days")
    

#    ['neighbourhood_group', 'neighbourhood', 'latitude', 'longitude',
#        'room_type', 'price', 'minimum_nights', 'number_of_reviews',
#        'reviews_per_month', 'calculated_host_listings_count',
#        'availability_365'] 
    

model = joblib.load("Model_Pipeline.pkl")


@app.get("/home")
def homepage():
    return {"Home Page" :" Wellcome to my new project"}


@app.post('/predict')
def predict(features:Features):

    row = pd.DataFrame([features.dict()] , columns=COLUMNS)
    prediction = model.predict(row)
    probability = model.predict_proba(row)

    return {
        "prediction" : prediction[0] , 
        "probability" : probability.tolist()
            }

